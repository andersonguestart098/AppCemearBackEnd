"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const path_1 = __importDefault(require("path"));
const node_notifier_1 = __importDefault(require("node-notifier"));
const notification_1 = require("./notification");
const auth_1 = __importDefault(require("./routes/auth")); // Rotas de autenticação
const auth_2 = __importDefault(require("./middleware/auth")); // Middleware de autenticação
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Inicialize o Socket.IO antes de qualquer middleware ou rota
const io = new socket_io_1.Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://cemear-b549eb196d7c.herokuapp.com",
            "https://cemear-8xm6g7j4a-andersonguestart098s-projects.vercel.app",
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
app.use(express_1.default.json());
const corsOptions = {
    origin: [
        "http://localhost:3000",
        "https://cemear-b549eb196d7c.herokuapp.com",
        "https://cemear-8xm6g7j4a-andersonguestart098s-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
// Inicialização do PrismaClient com logs detalhados
const prisma = new client_1.PrismaClient({
    log: ["query", "info", "warn", "error"],
});
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.send(`Socket IO iniciou na porta: ${PORT}`);
});
app.get("/", (req, res) => {
    res.write(`Socket.IO iniciou na porta: ${PORT}`);
    res.end();
});
// Configurando o Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Configuração do Multer para Cloudinary para postagens
const postStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: (req, file) => __awaiter(void 0, void 0, void 0, function* () {
        return {
            folder: "posts",
            allowed_formats: ["jpeg", "png", "jpg", "gif", "webp"], // Tipos de formatos suportados
            public_id: Date.now().toString(), // Nome único baseado no timestamp
        };
    }),
});
// Configuração do Multer para Cloudinary para uploads gerais
const uploadStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: (req, file) => __awaiter(void 0, void 0, void 0, function* () {
        return ({
            folder: "uploads", // Pasta no Cloudinary para uploads gerais
            format: () => __awaiter(void 0, void 0, void 0, function* () {
                const ext = path_1.default.extname(file.originalname).slice(1);
                return ext === "jpg" ? "jpeg" : ext; // Converte 'jpg' para 'jpeg' no Cloudinary
            }),
            public_id: Date.now().toString(), // Nome único baseado no timestamp
        });
    }),
});
// Configuração do multer com limite de tamanho de arquivo e formatos aceitos
const upload = (0, multer_1.default)({
    storage: uploadStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limite de 10MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/; // Formatos aceitos
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)."));
        }
    },
});
// Configuração para postagens com limite de 10MB e formatos aceitos
const postUpload = (0, multer_1.default)({
    storage: postStorage,
    limits: {
        fileSize: 20 * 1024 * 1024, // Limite de 20MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)."));
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
app.post("/posts", postUpload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const post = yield prisma.post.create({
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
        node_notifier_1.default.notify({
            title: "Novo Post",
            message: `Novo post: ${titulo}`,
            sound: true,
            wait: true,
        });
        console.log("Notificação local enviada via notifier");
        // Recuperando a assinatura mais recente do banco de dados
        const [subscription] = yield prisma.subscription.findMany({
            orderBy: { createdAt: "desc" },
            take: 1, // Pegamos a assinatura mais recente
        });
        if (subscription) {
            console.log("Assinatura mais recente encontrada no banco de dados:", subscription);
            // Conversão das chaves para Buffer
            const p256dhBuffer = Buffer.from(subscription.p256dh, "base64");
            const authBuffer = Buffer.from(subscription.auth, "base64");
            console.log("Comprimento de p256dh:", p256dhBuffer.length);
            console.log("Comprimento de auth:", authBuffer.length);
            // Validação do tamanho das chaves
            if (p256dhBuffer.length !== 65 || authBuffer.length !== 16) {
                console.error("O valor p256dh ou auth da assinatura está com tamanho inválido.");
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
                yield (0, notification_1.sendNotification)(subscriptionObject, payload);
                console.log("Notificação push enviada com sucesso!");
            }
            catch (error) {
                console.error("Erro ao enviar notificação push", error);
            }
        }
        else {
            console.error("Nenhuma assinatura encontrada no banco de dados.");
        }
        // Retorna o post criado com status 201
        return res.status(201).json(post);
    }
    catch (error) {
        console.error("Erro ao criar post:", error);
        return res.status(500).json({ error: "Erro ao criar post" });
    }
}));
// Rota para uploads gerais com Cloudinary
app.post("/upload", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file)
            return res.status(400).send("Nenhum arquivo enviado");
        // Use o secure_url do Cloudinary para pegar a URL correta da imagem e salvar no campo 'path'
        const imageUrl = req.file ? req.file.path : null; // Ajuste para o TypeScript
        // Salva a URL pública no campo 'path' no MongoDB
        const savedFile = yield prisma.file.create({
            data: {
                filename: req.file.originalname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                path: imageUrl, // Aproveitando o campo 'path' para armazenar a URL pública da imagem
            },
        });
        return res.json({ file: savedFile });
    }
    catch (error) {
        console.error("Erro ao fazer upload:", error);
        return res.status(500).json({ error: "Erro ao fazer upload" });
    }
}));
// Outras rotas
app.get("/posts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield prisma.post.findMany({
            orderBy: {
                created_at: "desc",
            },
        });
        res.json(posts);
    }
    catch (error) {
        console.error("Erro ao recuperar posts:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
}));
app.put("/posts/:id", postUpload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { conteudo, titulo } = req.body;
    const imageUrl = req.file ? req.file.path : undefined;
    if (!conteudo || !titulo) {
        return res.status(400).json({
            error: "Conteúdo e título são obrigatórios.",
        });
    }
    try {
        const post = yield prisma.post.update({
            where: { id },
            data: Object.assign({ conteudo,
                titulo }, (imageUrl && { imagePath: imageUrl })),
        });
        res.status(200).json(post);
    }
    catch (error) {
        console.error("Erro ao atualizar post:", error);
        res.status(500).json({ error: "Erro ao atualizar post" });
    }
}));
app.delete("/posts/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const post = yield prisma.post.delete({
            where: { id },
        });
        res.status(200).json({ message: "Post deletado com sucesso" });
    }
    catch (error) {
        console.error("Erro ao deletar post:", error);
        res.status(500).json({ error: "Erro ao deletar post" });
    }
}));
app.post("/sendNotification", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { titulo } = req.body;
    try {
        // Recupera todas as assinaturas do usuário (ou para todos os usuários)
        const subscriptions = yield prisma.subscription.findMany();
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
                yield (0, notification_1.sendNotification)(subscriptionObject, payload);
                console.log(`Notificação enviada com sucesso para: ${subscription.endpoint}`);
            }
            catch (error) {
                console.error(`Erro ao enviar notificação para: ${subscription.endpoint}`, error);
            }
        }
        res.status(200).json({ message: "Notificações enviadas com sucesso!" });
    }
    catch (error) {
        console.error("Erro ao enviar notificações push", error);
        res.status(500).json({ error: "Erro ao enviar notificações push" });
    }
}));
app.post("/subscribe", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { endpoint, keys } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Supondo que você tenha o ID do usuário no req.user
    if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
    }
    try {
        const subscription = yield prisma.subscription.create({
            data: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userId, // Associando a assinatura ao usuário
                keys: JSON.stringify(keys),
            },
        });
        console.log("Assinatura armazenada no banco de dados:", subscription);
        res.status(201).json({ message: "Assinatura salva com sucesso." });
    }
    catch (error) {
        console.error("Erro ao salvar assinatura:", error);
        res.status(500).json({ error: "Erro ao salvar assinatura" });
    }
}));
app.get("/events", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield prisma.event.findMany();
        const formattedEvents = events.map((event) => (Object.assign(Object.assign({}, event), { date: event.date.toISOString().split("T")[0] })));
        res.json(formattedEvents);
    }
    catch (error) {
        console.error("Erro ao buscar eventos:", error);
        res.status(500).send("Erro ao buscar eventos");
    }
}));
app.post("/events", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { date, descricao } = req.body;
    try {
        const newEvent = yield prisma.event.create({
            data: {
                date: new Date(date),
                descricao,
            },
        });
        res.status(201).json(newEvent);
    }
    catch (error) {
        console.error("Erro ao criar evento:", error);
        res.status(500).send("Erro ao criar evento");
    }
}));
app.use("/auth", auth_1.default);
app.get("/protected", auth_2.default, (req, res) => {
    res.send("Você está acessando uma rota protegida!");
});
app.get("/userTipoUsuario", auth_2.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
    }
    try {
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: { tipoUsuario: true },
        });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json({ tipo_usuario: user.tipoUsuario });
    }
    catch (error) {
        console.error("Erro ao obter tipo de usuário:", error);
        res.status(500).json({ error: "Erro ao obter tipo de usuário" });
    }
}));
// Configure o servidor para escutar na porta fornecida pelo Heroku ou na porta padrão
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
console.log(`DATABASE_URL: ${DATABASE_URL}`); // Verificar se o DATABASE_URL está correto
server.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
