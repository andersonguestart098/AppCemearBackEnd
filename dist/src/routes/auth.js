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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Registrar usuário
router.post("/register", [
    (0, express_validator_1.check)("usuario", "Por favor, inclua um usuário válido").notEmpty(),
    (0, express_validator_1.check)("password", "Por favor, inclua uma senha com 6 ou mais caracteres").isLength({ min: 6 }),
    (0, express_validator_1.check)("tipoUsuario", "Tipo de usuário é obrigatório").notEmpty(),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    const { usuario, password, tipoUsuario } = req.body;
    console.log("Registrando usuário:", usuario);
    try {
        let user = yield prisma.user.findUnique({
            where: { usuario },
        });
        if (user) {
            console.log("User already exists:", usuario);
            return res.status(400).json({ msg: "Usuário já existe" });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        user = yield prisma.user.create({
            data: {
                usuario,
                password: hashedPassword,
                tipoUsuario, // Incluindo o tipo de usuário
            },
        });
        console.log("Usuário criado:", user);
        const payload = {
            user: {
                id: user.id,
                tipoUsuario: user.tipoUsuario, // Incluindo tipoUsuario no payload
            },
        };
        const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        res.status(200).json({ token, tipoUsuario: user.tipoUsuario }); // Incluindo tipoUsuario na resposta
    }
    catch (error) {
        console.error("Erro durante o registro do usuário:", error.message);
        res.status(500).send("Erro no servidor");
    }
}));
// Login do usuário
router.post("/login", [
    (0, express_validator_1.check)("usuario", "Por favor, inclua um usuário válido").notEmpty(),
    (0, express_validator_1.check)("password", "Senha é obrigatória").exists(),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    const { usuario, password } = req.body;
    console.log("Tentando fazer login do usuário:", usuario);
    try {
        const user = yield prisma.user.findUnique({
            where: { usuario },
        });
        if (!user) {
            console.log("Usuário não encontrado:", usuario);
            return res.status(400).json({ msg: "Credenciais inválidas" });
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            console.log("Senha incorreta para este usuário:", usuario);
            return res.status(400).json({ msg: "Credenciais inválidas" });
        }
        const payload = {
            user: {
                id: user.id,
                tipoUsuario: user.tipoUsuario, // Incluindo tipoUsuario no payload
            },
        };
        const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        console.log("Login bem-sucedido para o usuário:", usuario);
        res.status(200).json({ token, tipoUsuario: user.tipoUsuario }); // Incluindo tipoUsuario na resposta
    }
    catch (error) {
        console.error("Erro durante o login:", error.message);
        res.status(500).send("Erro no servidor");
    }
}));
exports.default = router;
