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
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Inicialize o Socket.IO antes de qualquer middleware ou rota
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://cemear-b549eb196d7c.herokuapp.com",
      "https://cemear-cjuysinzc-andersonguestart098s-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
    "https://cemear-b549eb196d7c.herokuapp.com",
    "https://cemear-cjuysinzc-andersonguestart098s-projects.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Inicialização do PrismaClient com logs detalhados
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send(`Socket IO iniciou na porta: ${PORT}`);
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
    const posts = await prisma.post.findMany({
      orderBy: {
        created_at: "desc",
      },
    });
    console.log("Posts recuperados com sucesso:", posts);
    res.json(posts);
  } catch (error) {
    console.error("Erro ao recuperar posts:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/posts/"); // Pasta específica para uploads de imagens de posts
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome único para cada arquivo com timestamp
  },
});

const postUpload = multer({
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/; // Apenas arquivos de imagem
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Apenas arquivos JPEG, JPG e PNG são permitidos para imagens de posts."
        )
      );
    }
  },
});

app.post("/posts", postUpload.single("image"), async (req, res) => {
  const { conteudo, titulo } = req.body;
  const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : null; // Caminho da imagem

  console.log("Recebendo nova requisição para criar post:", {
    conteudo,
    titulo,
    imagePath,
    body: req.body, // Log completo do body
    file: req.file, // Log completo do arquivo
  });

  if (!conteudo || !titulo) {
    console.error("Dados de postagem inválidos: conteúdo ou título faltando");
    return res.status(400).json({
      error: "Conteúdo e título são obrigatórios.",
    });
  }

  try {
    const post = await prisma.post.create({
      data: {
        conteudo,
        titulo,
        imagePath, // Salva o caminho da imagem no banco de dados
      },
    });

    console.log("Post criado com sucesso:", post);

    io.emit("new-post");
    console.log("Emitindo evento de novo post via Socket.IO");

    return res.status(201).json(post);
  } catch (error) {
    console.error("Erro ao criar post:", error);
    return res.status(500).json({ error: "Erro ao criar post" });
  }
});

// Endpoint para atualizar um post existente
app.put("/posts/:id", postUpload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { conteudo, titulo } = req.body;
  const imagePath = req.file
    ? `/uploads/posts/${req.file.filename}`
    : undefined;

  console.log("Recebendo requisição para atualizar post:", {
    id,
    conteudo,
    titulo,
    imagePath,
  });

  if (!conteudo || !titulo) {
    console.error("Dados de postagem inválidos: conteúdo ou título faltando");
    return res.status(400).json({
      error: "Conteúdo e título são obrigatórios.",
    });
  }

  try {
    // Atualiza o post no banco de dados
    const post = await prisma.post.update({
      where: { id },
      data: {
        conteudo,
        titulo,
        ...(imagePath && { imagePath }), // Se houver uma nova imagem, atualiza o campo
      },
    });

    console.log("Post atualizado com sucesso:", post);

    return res.status(200).json(post);
  } catch (error) {
    console.error("Erro ao atualizar post:", error);
    return res.status(500).json({ error: "Erro ao atualizar post" });
  }
});

// Endpoint para deletar um post existente
app.delete("/posts/:id", async (req, res) => {
  const { id } = req.params;

  console.log("Recebendo requisição para deletar post:", id);

  try {
    // Deleta o post no banco de dados
    const post = await prisma.post.delete({
      where: { id },
    });

    console.log("Post deletado com sucesso:", post);

    return res.status(200).json({ message: "Post deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar post:", error);
    return res.status(500).json({ error: "Erro ao deletar post" });
  }
});

app.post("/sendNotification", async (req, res) => {
  const { titulo } = req.body;

  try {
    // Recupera todas as assinaturas do usuário (ou para todos os usuários)
    const subscriptions = await prisma.subscription.findMany();

    if (subscriptions.length === 0) {
      console.error("Nenhuma assinatura encontrada.");
      return res.status(404).json({ error: "Nenhuma assinatura encontrada" });
    }

    const payload = JSON.stringify({
      title: titulo || "Novo Post!",
      body: `Um novo post foi criado com o título: ${titulo}`,
      icon: "/path/to/icon.png",
    });

    // Enviar notificação para todas as assinaturas
    for (const subscription of subscriptions) {
      const subscriptionObject = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await sendNotification(subscriptionObject, payload);
        console.log(
          `Notificação enviada com sucesso para: ${subscription.endpoint}`
        );
      } catch (error) {
        console.error(
          `Erro ao enviar notificação para: ${subscription.endpoint}`,
          error
        );
      }
    }

    res.status(200).json({ message: "Notificações enviadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar notificações push", error);
    res.status(500).json({ error: "Erro ao enviar notificações push" });
  }
});

const { ObjectId } = require("mongodb");

app.post("/subscribe", async (req, res) => {
  const { endpoint, keys, userId: bodyUserId } = req.body;

  console.log("Chaves recebidas do cliente:", keys);

  try {
    // Verifica se o userId foi fornecido e é um ObjectId válido
    if (!bodyUserId || !ObjectId.isValid(bodyUserId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const userId = new ObjectId(bodyUserId); // Certifique-se de que o ID seja um ObjectId válido

    // Armazena a assinatura
    const subscription = await prisma.subscription.create({
      data: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user: {
          connect: { id: userId }, // Conecta com o usuário usando o ObjectId convertido
        },
        keys: JSON.stringify(keys),
      },
    });

    console.log("Assinatura armazenada no banco de dados:", subscription);
    res.status(201).json({ message: "Assinatura salva com sucesso." });
  } catch (error) {
    console.error("Erro ao salvar assinatura:", error);
    res.status(500).json({ error: "Erro ao salvar assinatura" });
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

// Configure o servidor para escutar na porta fornecida pelo Heroku ou na porta padrão
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
console.log(`DATABASE_URL: ${DATABASE_URL}`); // Verificar se o DATABASE_URL está correto

server.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
