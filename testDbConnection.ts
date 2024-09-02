import mongoose from "mongoose";
import dotenv from "dotenv";

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const mongoUri = process.env.DATABASE_URL || "mongodb://localhost:27017/test";

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Conexão com o MongoDB bem-sucedida!");
    mongoose.connection.close(); // Feche a conexão após o teste
  })
  .catch((err: any) => {
    console.error("Error ao conectar com o MongoDB:", err);
  });
