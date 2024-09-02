"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Carregar variáveis de ambiente do arquivo .env
dotenv_1.default.config();
const mongoUri = process.env.DATABASE_URL || "mongodb://localhost:27017/test";
mongoose_1.default
    .connect(mongoUri)
    .then(() => {
    console.log("Conexão com o MongoDB bem-sucedida!");
    mongoose_1.default.connection.close(); // Feche a conexão após o teste
})
    .catch((err) => {
    console.error("Erro ao conectar com o MongoDB:", err);
});
