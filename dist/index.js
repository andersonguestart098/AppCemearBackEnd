"use strict";
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
const auth_1 = __importDefault(require("./routes/auth")); // Apenas uma importação para rotas de autenticação
const auth_2 = __importDefault(require("./middleware/auth")); // Middleware de autenticação
const app = (0, express_1.default)();
app.use(express_1.default.json());
const corsOptions = {
    origin: [
        "http://localhost:3000",
        "https://cemear-844a30ef7d3e.herokuapp.com",
    ],
    methods: ["GET", "POST"],
};
app.use((0, cors_1.default)(corsOptions));
const prisma = new client_1.PrismaClient();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://cemear-844a30ef7d3e.herokuapp.com",
        ],
        methods: ["GET", "POST"],
    },
});
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.write(`Soket IO start on Port : ${PORT}`);
    res.end();
});
io.on("connection", (socket) => {
    console.log("user connected");
    socket.on("message", (ms) => {
        io.emit("message", ms);
    });
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
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
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
            where: { id: req.params.id }, // Não precisa converter para int
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
    const posts = yield prisma.post.findMany({
        orderBy: { created_at: "desc" },
    });
    res.json(posts);
}));
app.post("/posts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { conteudo, titulo } = req.body;
    const post = yield prisma.post.create({
        data: { conteudo, titulo },
    });
    io.emit("new-post");
    // Envia a notificação para o sistema operacional
    node_notifier_1.default.notify({
        title: "Novo Post",
        message: `Novo post: ${titulo}`,
        sound: true,
        wait: true,
    });
    // Obtenha a assinatura do banco de dados
    const subscription = yield prisma.subscription.findFirst();
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
            yield (0, notification_1.sendNotification)(subscriptionObject, payload);
            console.log("Notificação push enviada com sucesso!");
        }
        catch (error) {
            console.error("Erro ao enviar notificação push", error);
        }
    }
    else {
        console.error("nenhuma assinatura encontrada no banco de dados.");
    }
    res.status(201).json(post);
}));
app.post("/sendNotification", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield prisma.subscription.findFirst();
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
        yield (0, notification_1.sendNotification)(subscriptionObject, payload);
        console.log("Notificação push enviada com sucesso!");
        res.status(200).json({ message: "Notificação enviada com sucesso!" });
    }
    catch (error) {
        console.error("Erro ao enviar notificação push", error);
        res.status(500).json({ error: "Erro ao enviar notificação push" });
    }
}));
// Endpoint para salvar uma assinatura
app.post("/subscribe", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint, keys, expirationTime } = req.body;
    try {
        const savedSubscription = yield prisma.subscription.create({
            data: {
                endpoint: endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                expirationTime: expirationTime ? new Date(expirationTime) : null,
                keys: JSON.stringify(keys),
            },
        });
        res.status(201).send(savedSubscription);
    }
    catch (error) {
        console.error("Erro ao criar assinatura:", error);
        res.status(500).send("Erro ao criar assinatura");
    }
}));
// Endpoint para obter assinaturas (para fins de administração ou teste)
app.get("/subscriptions", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscriptions = yield prisma.subscription.findMany();
        res.json(subscriptions);
    }
    catch (error) {
        console.error("Erro ao obter assinaturas:", error);
        res.status(500).send("Erro ao obter assinaturas");
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
// Configurar rotas de autenticação
app.use("/auth", auth_1.default);
// Adicionar rota protegida para teste
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
const PORT = process.env.PORT || 17143;
app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
