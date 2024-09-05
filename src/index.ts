import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import notifier from "node-notifier";
import { sendNotification } from "./notification";
import authRoutes from "./routes/auth"; // Rotas de autenticação
import auth from "./middleware/auth"; // Middleware de autenticação
import { Request, Response } from "express";
<<<<<<< HEAD
import * as dotenv from "dotenv";
dotenv.config();
=======
>>>>>>> b45e33c46f10af2e16a8def8b1d85e79ed87a97d

const app = express();
const server = http.createServer(app);

// Inicialize o Socket.IO antes de qualquer middleware ou rota
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://cemear-844a30ef7d3e.herokuapp.com",
    ],
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", (msg) => {
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.use(express.json());

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://cemear-844a30ef7d3e.herokuapp.com",
    "https://66d6181f7a08694ac1628268--fantastic-eclair-df8cfe.netlify.app", // Adicione o novo domínio aqui
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Inicialização do PrismaClient com logs detalhados
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

<<<<<<< HEAD
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send(`Socket IO iniciou na porta: ${PORT}`);
=======
// Criar servidor HTTP
const server = http.createServer(app);

// Configuração do Socket.IO
const io = new SocketIOServer(server, {
  cors: corsOptions, // Usar o mesmo objeto de configuração de CORS
  path: "/socket.io", // Certifique-se de que o caminho esteja correto
});

io.on("connection", (socket) => {
  console.log("user connected");
  socket.on("message", (ms) => {
    io.emit("message", ms);
  });
>>>>>>> b45e33c46f10af2e16a8def8b1d85e79ed87a97d
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.write(`Socket.IO iniciou na porta: ${PORT}`);
  res.end();
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

app.get("/socket-test", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "socket-test.html"));
});

const uploadsDir = path.join(__dirname, "../uploads");

app.use("/uploads", express.static(uploadsDir));

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
      where: { id: req.params.id },
    });

    if (!file) return res.status(404).send("Arquivo não encontrado");

    res.download(file.path, file.originalname);
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    res.status(500).send("Erro ao fazer download");
  }
});

app.get("/posts", async (req, res) => {
  try {
    console.log("Iniciando fetch de posts...");
    const posts = await prisma.post.findMany();
    console.log("Posts recuperados com sucesso:", posts);
    res.json(posts);
  } catch (error) {
    console.error("Erro ao recuperar posts:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/posts", async (req, res) => {
  const { conteudo, titulo } = req.body;
  const post = await prisma.post.create({
    data: { conteudo, titulo },
  });

  io.emit("new-post");

  notifier.notify({
    title: "Novo Post",
    message: `Novo post: ${titulo}`,
    sound: true,
    wait: true,
  });

  const subscription = await prisma.subscription.findFirst();
  const payload = JSON.stringify({
    title: titulo,
    body: "Novo Post!",
    icon: "public/icones/logoCE.ico",
  });

  if (subscription) {
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

app.post("/subscribe", async (req, res) => {
  const { endpoint, keys, expirationTime } = req.body;

  try {
    const savedSubscription = await prisma.subscription.create({
      data: {
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        expirationTime: expirationTime ? new Date(expirationTime) : null,
        keys: JSON.stringify(keys),
      },
    });

    res.status(201).send(savedSubscription);
  } catch (error) {
    console.error("Erro ao criar assinatura:", error);
    res.status(500).send("Erro ao criar assinatura");
  }
});

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
    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    res.status(500).send("Erro ao criar evento");
  }
});

app.use("/auth", authRoutes);

app.get("/protected", auth, (req, res) => {
  res.send("Você está acessando uma rota protegida!");
});

app.get("/userTipoUsuario", auth, async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tipoUsuario: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ tipo_usuario: user.tipoUsuario });
  } catch (error) {
    console.error("Erro ao obter tipo de usuário:", error);
    res.status(500).json({ error: "Erro ao obter tipo de usuário" });
  }
});

<<<<<<< HEAD
// Configure o servidor para escutar na porta fornecida pelo Heroku ou na porta padrão
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
console.log(`DATABASE_URL: ${DATABASE_URL}`); // Verificar se o DATABASE_URL está correto

=======
const PORT = process.env.PORT || 17143;

// Alteração para utilizar o servidor HTTP e o Socket.IO juntos
>>>>>>> b45e33c46f10af2e16a8def8b1d85e79ed87a97d
server.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
