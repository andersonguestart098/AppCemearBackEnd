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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
            "https://66db5d68366cdea0d403f353--dreamy-faloodeh-61888b.netlify.app",
            "https://app-cemear-front-end-qvgs-kvxi7xb61.vercel.app",
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
        "https://66db5d68366cdea0d403f353--dreamy-faloodeh-61888b.netlify.app",
        "https://app-cemear-front-end-qvgs-kvxi7xb61.vercel.app",
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
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.write(`Socket.IO iniciou na porta: ${PORT}`);
    res.end();
});
// Configuração do multer
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path_1.default.extname(file.originalname)),
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname)
            return cb(null, true);
        else
            cb(new Error("Apenas arquivos JPEG, PNG e PDF são permitidos"));
    },
});
app.get("/socket-test", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "public", "socket-test.html"));
});
const uploadsDir = path_1.default.join(__dirname, "../uploads");
app.use("/uploads", express_1.default.static(uploadsDir));
app.get("/files", (req, res) => {
    fs_1.default.readdir(uploadsDir, (err, files) => {
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
    const filePath = path_1.default.join(uploadsDir, req.params.filename);
    fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
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
app.post("/upload", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file)
            return res.status(400).send("Nenhum arquivo enviado");
        const file = req.file;
        const savedFile = yield prisma.file.create({
            data: {
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                path: file.path,
            },
        });
        res.json({ file: savedFile });
    }
    catch (error) {
        console.error("Erro ao fazer upload:", error);
        res.status(500).send("Erro ao fazer upload");
    }
}));
app.get("/download/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = yield prisma.file.findUnique({
            where: { id: req.params.id },
        });
        if (!file)
            return res.status(404).send("Arquivo não encontrado");
        res.download(file.path, file.originalname);
    }
    catch (error) {
        console.error("Erro ao fazer download:", error);
        res.status(500).send("Erro ao fazer download");
    }
}));
app.get("/posts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Iniciando fetch de posts...");
        const posts = yield prisma.post.findMany({
            orderBy: {
                id: "desc",
            },
        });
        console.log("Posts recuperados com sucesso:", posts);
        res.json(posts);
    }
    catch (error) {
        console.error("Erro ao recuperar posts:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
}));
app.post("/posts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { conteudo, titulo } = req.body;
    console.log("Recebendo nova requisição para criar post:", {
        conteudo,
        titulo,
    });
    if (!conteudo || !titulo) {
        console.error("Dados de postagem inválidos: conteúdo ou título faltando");
        return res.status(400).json({
            error: "Conteúdo e título são obrigatórios.",
        });
    }
    try {
        // Criação do post no banco de dados
        const post = yield prisma.post.create({
            data: { conteudo, titulo },
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
        // Recuperando todas as assinaturas do banco de dados
        const subscriptions = yield prisma.subscription.findMany({
            orderBy: { createdAt: "desc" },
        });
        if (subscriptions.length > 0) {
            console.log("Assinaturas encontradas no banco de dados:", subscriptions);
            // Filtra assinaturas únicas pelo campo 'endpoint'
            const uniqueSubscriptions = subscriptions.filter((value, index, self) => index === self.findIndex((t) => t.endpoint === value.endpoint));
            // Preparando payload de notificação
            const payload = JSON.stringify({
                title: titulo,
                body: "Novo Post!",
                icon: "public/icones/logoCE.ico",
            });
            // Itera sobre assinaturas únicas e envia a notificação para cada uma
            for (const subscription of uniqueSubscriptions) {
                try {
                    const subscriptionObject = {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    };
                    // Envia a notificação push para cada assinatura única
                    yield (0, notification_1.sendNotification)(subscriptionObject, payload);
                    console.log(`Notificação push enviada com sucesso para ${subscription.endpoint}`);
                }
                catch (error) {
                    console.error(`Erro ao enviar notificação push para ${subscription.endpoint}`, error);
                    // Caso a notificação falhe (usuário inativo, por exemplo), remover a assinatura
                    yield prisma.subscription.delete({
                        where: { id: subscription.id },
                    });
                    console.log(`Assinatura ${subscription.endpoint} removida do banco de dados`);
                }
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
app.put("/posts/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { titulo, conteudo } = req.body;
    try {
        const updatedPost = yield prisma.post.update({
            where: { id: String(id) },
            data: { titulo, conteudo },
        });
        res.json(updatedPost);
    }
    catch (error) {
        console.error("Erro ao editar post:", error);
        res.status(500).json({ error: "Erro ao editar post" });
    }
}));
// Rota para deletar um post (sem autenticação)
app.delete("/posts/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.post.delete({
            where: { id: String(id) },
        });
        // Emite o evento de deleção para o frontend via WebSocket
        io.emit("post-deleted", id);
        res.status(204).send();
    }
    catch (error) {
        console.error("Erro ao deletar post:", error);
        res.status(500).json({ error: "Erro ao deletar post" });
    }
}));
app.post("/sendNotification", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Recebendo requisição para enviar notificação");
    try {
        // Ajuste a consulta para buscar a assinatura mais recente
        const subscription = yield prisma.subscription.findFirst({
            orderBy: {
                createdAt: "desc", // Ordena pela data de criação para pegar a assinatura mais recente
            },
        });
        if (subscription) {
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
                yield (0, notification_1.sendNotification)(subscriptionObject, payload);
                console.log("Notificação push enviada com sucesso!");
                res.status(200).json({ message: "Notificação enviada com sucesso!" });
            }
            catch (error) {
                console.error(`Erro ao enviar notificação push para ${subscription.endpoint}`, error);
                // Remover a assinatura em caso de erro
                yield prisma.subscription.delete({
                    where: { id: subscription.id },
                });
                console.log(`Assinatura ${subscription.endpoint} removida do banco de dados`);
                res.status(500).json({ error: "Erro ao enviar notificação push" });
            }
        }
        else {
            console.error("Nenhuma assinatura encontrada.");
            res.status(404).json({ error: "Nenhuma assinatura encontrada" });
        }
    }
    catch (error) {
        console.error("Erro ao buscar assinatura:", error);
        res.status(500).json({ error: "Erro ao buscar assinatura" });
    }
}));
app.post("/subscribe", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint, keys } = req.body;
    console.log("Chaves recebidas do cliente:");
    console.log("p256dh (base64):", keys.p256dh);
    console.log("auth (base64):", keys.auth);
    const p256dhBuffer = Buffer.from(keys.p256dh, "base64");
    const authBuffer = Buffer.from(keys.auth, "base64");
    if (p256dhBuffer.length !== 65 || authBuffer.length !== 16) {
        console.error("Chaves p256dh ou auth têm o comprimento incorreto.");
        return res.status(400).json({ error: "Chaves de assinatura inválidas." });
    }
    try {
        // Verificar se já existe uma assinatura com o mesmo endpoint usando findFirst
        const existingSubscription = yield prisma.subscription.findFirst({
            where: { endpoint },
        });
        if (existingSubscription) {
            console.log("Assinatura já existente para este endpoint.");
            return res.status(200).json({ message: "Assinatura já existe." });
        }
        // Criação da assinatura, incluindo o campo 'keys'
        const subscription = yield prisma.subscription.create({
            data: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                keys: JSON.stringify(keys), // Stringificando o JSON para o campo 'keys'
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
