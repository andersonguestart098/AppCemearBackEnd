import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
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
      "https://cemear-qwluyjvwe-andersonguestart098s-projects.vercel.app",
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
    "https://cemear-qwluyjvwe-andersonguestart098s-projects.vercel.app",
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

app.get("/", (req, res) => {
  res.write(`Socket.IO iniciou na porta: ${PORT}`);
  res.end();
});

// Configurando o Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuração do Multer para Cloudinary para postagens
const postStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "posts", // Pasta no Cloudinary para posts
      format: async () => {
        const ext = path.extname(file.originalname).slice(1);
        return ext === "jpg" ? "jpeg" : ext; // Converte 'jpg' para 'jpeg' no Cloudinary
      },
      public_id: Date.now().toString(), // Nome único baseado no timestamp
    };
  },
});

// Configuração do Multer para Cloudinary para uploads gerais
const uploadStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "uploads", // Pasta no Cloudinary para uploads gerais
    format: async () => {
      const ext = path.extname(file.originalname).slice(1);
      return ext === "jpg" ? "jpeg" : ext; // Converte 'jpg' para 'jpeg' no Cloudinary
    },
    public_id: Date.now().toString(), // Nome único baseado no timestamp
  }),
});

// Configuração do multer com limite de tamanho de arquivo e formatos aceitos
const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/; // Formatos aceitos
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, webp).")
      );
    }
  },
});

// Configuração para postagens com limite de 10MB e formatos aceitos
const postUpload = multer({
  storage: postStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Limite de 20MB
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, webp).")
      );
    }
  },
});

const validateCloudinaryUrl = (url) => {
  if (url && url.startsWith("https://res.cloudinary.com")) {
    return url;
  }
  console.error(`URL inválido do Cloudinary: ${url}`);
  return null;
};

// Rota para criação de posts com Cloudinary
app.post("/posts", postUpload.single("image"), async (req, res) => {
  const { conteudo, titulo } = req.body;

  // Log do arquivo de imagem recebido
  console.log("Imagem recebida: ", req.file);

  // Verifica se a imagem foi recebida
  if (!req.file) {
    console.error("Nenhum arquivo de imagem recebido.");
    return res.status(400).json({ error: "Imagem é obrigatória." });
  }

  // Usando o secure_url do Cloudinary para pegar a URL correta da imagem
  const imageUrl = req.file ? validateCloudinaryUrl(req.file.path) : null;

  // Log para verificar o URL da imagem
  console.log("URL da imagem: ", imageUrl);

  if (!imageUrl) {
    console.error("Erro ao validar URL da imagem.");
    return res.status(400).json({
      error: "A URL da imagem é inválida ou não foi gerada corretamente.",
    });
  }

  // Verifica se o conteúdo e o título foram fornecidos
  if (!conteudo || !titulo) {
    console.error("Dados de postagem inválidos: conteúdo ou título faltando");
    return res.status(400).json({
      error: "Conteúdo e título são obrigatórios.",
    });
  }

  try {
    // Criação do post no banco de dados
    const post = await prisma.post.create({
      data: {
        conteudo,
        titulo,
        imagePath: imageUrl, // Salva a URL pública correta da imagem no banco de dados
      },
    });

    console.log("Post criado com sucesso:", post);

    // Emitindo o evento para o Socket.IO
    io.emit("new-post");
    console.log("Emitindo evento de novo post via Socket.IO");

    // Enviando notificação local
    notifier.notify({
      title: "Novo Post",
      message: `Novo post: ${titulo}`,
      sound: true,
      wait: true,
    });
    console.log("Notificação local enviada via notifier");

    // Recuperando a assinatura mais recente do banco de dados
    const [subscription] = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 1, // Pegamos a assinatura mais recente
    });

    if (subscription) {
      console.log(
        "Assinatura mais recente encontrada no banco de dados:",
        subscription
      );

      // Conversão das chaves para Buffer
      const p256dhBuffer = Buffer.from(subscription.p256dh, "base64");
      const authBuffer = Buffer.from(subscription.auth, "base64");

      console.log("Comprimento de p256dh:", p256dhBuffer.length);
      console.log("Comprimento de auth:", authBuffer.length);

      // Validação do tamanho das chaves
      if (p256dhBuffer.length !== 65 || authBuffer.length !== 16) {
        console.error(
          "O valor p256dh ou auth da assinatura está com tamanho inválido."
        );
        return res.status(400).json({
          error: "A assinatura tem um valor p256dh ou auth inválido.",
        });
      }

      // Preparando payload de notificação
      const payload = JSON.stringify({
        title: titulo,
        body: "Novo Post!",
        icon: "public/icones/logoCE.ico",
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
      } catch (error) {
        console.error("Erro ao enviar notificação push", error);
      }
    } else {
      console.error("Nenhuma assinatura encontrada no banco de dados.");
    }

    // Retorna o post criado com status 201
    return res.status(201).json(post);
  } catch (error) {
    console.error("Erro ao criar post:", error);
    return res.status(500).json({ error: "Erro ao criar post" });
  }
});

// Rota para uploads gerais com Cloudinary
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Nenhum arquivo enviado");

    // Use o secure_url do Cloudinary para pegar a URL correta da imagem e salvar no campo 'path'
    const imageUrl = req.file ? (req.file as any).path : null; // Ajuste para o TypeScript

    // Salva a URL pública no campo 'path' no MongoDB
    const savedFile = await prisma.file.create({
      data: {
        filename: req.file.originalname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        path: imageUrl, // Aproveitando o campo 'path' para armazenar a URL pública da imagem
      },
    });

    return res.json({ file: savedFile });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

// Outras rotas
app.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        created_at: "desc",
      },
    });
    res.json(posts);
  } catch (error) {
    console.error("Erro ao recuperar posts:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/posts/:id", postUpload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { conteudo, titulo } = req.body;
  const imageUrl = req.file ? req.file.path : undefined;

  if (!conteudo || !titulo) {
    return res.status(400).json({
      error: "Conteúdo e título são obrigatórios.",
    });
  }

  try {
    const post = await prisma.post.update({
      where: { id },
      data: {
        conteudo,
        titulo,
        ...(imageUrl && { imagePath: imageUrl }), // Se houver uma nova imagem, atualiza o campo
      },
    });

    res.status(200).json(post);
  } catch (error) {
    console.error("Erro ao atualizar post:", error);
    res.status(500).json({ error: "Erro ao atualizar post" });
  }
});

app.delete("/posts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const post = await prisma.post.delete({
      where: { id },
    });

    res.status(200).json({ message: "Post deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar post:", error);
    res.status(500).json({ error: "Erro ao deletar post" });
  }
});

app.post("/sendNotification", async (req, res) => {
  console.log("Recebendo requisição para enviar notificação");

  try {
    // Ajuste a consulta para buscar a assinatura mais recente
    const subscription = await prisma.subscription.findFirst({
      orderBy: {
        createdAt: "desc", // Ordena pela data de criação para pegar a assinatura mais recente
      },
    });

    if (subscription) {
      // Logar as chaves recuperadas
      console.log("Chaves recuperadas diretamente do banco:");
      console.log("p256dh (base64, direto do banco):", subscription.p256dh);
      console.log("auth (base64, direto do banco):", subscription.auth);

      const p256dhDecoded = Buffer.from(subscription.p256dh, "base64");
      const authDecoded = Buffer.from(subscription.auth, "base64");

      console.log("Tamanhos das chaves decodificadas:");
      console.log("Tamanho de p256dh decodificado:", p256dhDecoded.length);
      console.log("Tamanho de auth decodificado:", authDecoded.length);

      if (p256dhDecoded.length !== 65 || authDecoded.length !== 16) {
        console.error("Chaves com tamanho inválido após decodificação.");
        return res
          .status(400)
          .json({ error: "Chaves com tamanho inválido após decodificação." });
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
          p256dh: subscription.p256dh, // Usar o valor original base64
          auth: subscription.auth, // Usar o valor original base64
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
    } else {
      console.error("Nenhuma assinatura encontrada.");
      res.status(404).json({ error: "Nenhuma assinatura encontrada" });
    }
  } catch (error) {
    console.error("Erro ao buscar assinatura:", error);
    res.status(500).json({ error: "Erro ao buscar assinatura" });
  }
});

app.post("/subscribe", async (req, res) => {
  const { endpoint, keys } = req.body;

  // Logando as chaves recebidas para debug
  console.log("Chaves recebidas do cliente:");
  console.log("p256dh (base64):", keys.p256dh);
  console.log("auth (base64):", keys.auth);

  // Converte as chaves de base64 para binário
  const p256dhBuffer = Buffer.from(keys.p256dh, "base64");
  const authBuffer = Buffer.from(keys.auth, "base64");

  console.log("Tamanhos das chaves:");
  console.log("Tamanho de p256dh:", p256dhBuffer.length);
  console.log("Tamanho de auth:", authBuffer.length);

  if (p256dhBuffer.length !== 65 || authBuffer.length !== 16) {
    console.error("Chaves p256dh ou auth têm o comprimento incorreto.");
    return res.status(400).json({ error: "Chaves de assinatura inválidas." });
  }

  try {
    // Armazena as chaves no banco como base64 (string)
    const subscription = await prisma.subscription.create({
      data: {
        endpoint,
        p256dh: keys.p256dh, // Armazena como string base64
        auth: keys.auth, // Armazena como string base64
        keys: JSON.stringify(keys), // Opcional: se você ainda quiser armazenar a versão em JSON
      },
    });

    // Logar o que foi armazenado
    console.log("Assinatura armazenada no banco de dados:");
    console.log("p256dh armazenado (base64):", subscription.p256dh);
    console.log("auth armazenado (base64):", subscription.auth);

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
