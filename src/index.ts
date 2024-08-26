import express from "express";
import http from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import notifier from "node-notifier";
import { sendNotification } from "./notification"; // Importa a função de envio de notificação

const app = express();
app.use(express.json());
app.use(cors());

const prisma = new PrismaClient();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    else cb(new Error("Apenas arquivos JPEG, PNG e PDF são permitidos"));
  },
});

const uploadsDir = path.join(__dirname, "../uploads");

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/files", (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error("Erro ao listar arquivos", err);
      return res.status(500).send("Erro ao listar arquivos.");
    }

    const fileList = files.map((file) => ({
      filename: file,
      path: `/uploads/${file}`,
    }));

    res.json(fileList);
  });
});

app.get("/files/download/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("Arquivo não encontrado", err);
      return res.status(404).send("Arquivo não encontrado.");
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error("Erro ao baixar arquivo", err);
        res.status(500).send("Erro ao baixar arquivo.");
      }
    });
  });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Nenhum arquivo enviado");

    const file = req.file;
    const savedFile = await prisma.file.create({
      data: {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        path: file.path,
      },
    });

    res.json({ file: savedFile });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    res.status(500).send("Erro ao fazer upload");
  }
});

app.get("/download/:id", async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!file) return res.status(404).send("Arquivo não encontrado");

    res.download(file.path, file.originalname);
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    res.status(500).send("Erro ao fazer download");
  }
});

app.get("/posts", async (req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { created_at: "desc" },
  });
  res.json(posts);
});

app.post("/posts", async (req, res) => {
  const { conteudo, titulo } = req.body;
  const post = await prisma.post.create({
    data: { conteudo, titulo },
  });

  io.emit("new-post");

  // Envia a notificação para o sistema operacional
  notifier.notify({
    title: "Novo Post Criado",
    message: `Um novo post foi criado com o título: ${titulo}`,
    sound: true,
    wait: true,
  });

  // Obtenha a assinatura do banco de dados
  // Obtenha a assinatura do banco de dados
  const subscription = await prisma.subscription.findFirst(); // Obtenha a assinatura correta
  const payload = JSON.stringify({
    title: titulo,
    body: "Este é um teste de notificação push",
    icon: "/path/to/icon.png",
  });

  if (subscription) {
    // Certifique-se de que subscription tem o formato correto
    const subscriptionObject = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    try {
      await sendNotification(subscriptionObject, payload);
      console.log("Notificação push enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar notificação push", error);
    }
  } else {
    console.error("Nenhuma assinatura encontrada no banco de dados.");
  }

  res.status(201).json(post);
});

app.post("/sendNotification", async (req, res) => {
  // Obtenha a assinatura do banco de dados
  const subscription = await prisma.subscription.findFirst();

  if (!subscription) {
    return res.status(404).json({ error: "Nenhuma assinatura encontrada." });
  }

  const { titulo } = req.body;
  const payload = JSON.stringify({
    title: titulo || "Novo Post!",
    body: `Um novo post foi criado com o título: ${titulo}`,
    icon: "/path/to/icon.png",
  });

  const subscriptionObject = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await sendNotification(subscriptionObject, payload);
    console.log("Notificação push enviada com sucesso!");
    res.status(200).json({ message: "Notificação enviada com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar notificação push", error);
    res.status(500).json({ error: "Erro ao enviar notificação push" });
  }
});

// Endpoint para salvar uma assinatura
app.post("/subscribe", async (req, res) => {
  const { endpoint, keys, expirationTime } = req.body;

  try {
    const savedSubscription = await prisma.subscription.create({
      data: {
        endpoint: endpoint,
        p256dh: keys.p256dh, // Chave pública
        auth: keys.auth, // Chave de autenticação
        expirationTime: expirationTime ? new Date(expirationTime) : null, // Opcional
        keys: JSON.stringify(keys), // Converte as chaves para JSON string
      },
    });

    res.status(201).send(savedSubscription);
  } catch (error) {
    console.error("Erro ao criar assinatura:", error);
    res.status(500).send("Erro ao criar assinatura");
  }
});

// Endpoint para obter assinaturas (para fins de administração ou teste)
app.get("/subscriptions", async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany();
    res.json(subscriptions);
  } catch (error) {
    console.error("Erro ao obter assinaturas:", error);
    res.status(500).send("Erro ao obter assinaturas");
  }
});

app.get("/events", async (req, res) => {
  try {
    const events = await prisma.event.findMany();
    const formattedEvents = events.map((event) => ({
      ...event,
      date: event.date.toISOString().split("T")[0],
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    res.status(500).send("Erro ao buscar eventos");
  }
});

app.post("/events", async (req, res) => {
  const { date, descricao } = req.body;

  try {
    const newEvent = await prisma.event.create({
      data: {
        date: new Date(date),
        descricao,
      },
    });
    res.status(201).json({ id: newEvent.id });
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    res.status(500).send("Erro ao criar evento");
  }
});

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
