import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, User } from "@prisma/client";
import { check, validationResult } from "express-validator";

const router = express.Router();
const prisma = new PrismaClient();

interface JwtPayload {
  user: {
    id: string;
    tipoUsuario: string; // Adicionando tipoUsuario ao payload
  };
}

// Registrar usuário
router.post(
  "/register",
  [
    check("usuario", "Por favor, inclua um usuário válido").notEmpty(),
    check(
      "password",
      "Por favor, inclua uma senha com 6 ou mais caracteres"
    ).isLength({ min: 6 }),
    check("tipoUsuario", "Tipo de usuário é obrigatório").notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { usuario, password, tipoUsuario } = req.body;

    console.log("Registrando usuário:", usuario);

    try {
      let user = await prisma.user.findUnique({
        where: { usuario },
      });

      if (user) {
        console.log("User already exists:", usuario);
        return res.status(400).json({ msg: "Usuário já existe" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = await prisma.user.create({
        data: {
          usuario,
          password: hashedPassword,
          tipoUsuario, // Incluindo o tipo de usuário
        },
      });

      console.log("Usuário criado:", user);

      const payload: JwtPayload = {
        user: {
          id: user.id,
          tipoUsuario: user.tipoUsuario, // Incluindo tipoUsuario no payload
        },
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: "1h",
      });

      res.status(200).json({ token, tipoUsuario: user.tipoUsuario }); // Incluindo tipoUsuario na resposta
    } catch (error: any) {
      console.error("Erro durante o registro do usuário:", error.message);
      res.status(500).send("Erro no servidor");
    }
  }
);

// Login do usuário
router.post(
  "/login",
  [
    check("usuario", "Por favor, inclua um usuário válido").notEmpty(),
    check("password", "Senha é obrigatória").exists(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { usuario, password } = req.body;

    console.log("Tentando fazer login do usuário:", usuario);

    try {
      const user = await prisma.user.findUnique({
        where: { usuario },
      });

      if (!user) {
        console.log("Usuário não encontrado:", usuario);
        return res.status(400).json({ msg: "Credenciais inválidas" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        console.log("Senha incorreta para este usuário:", usuario);
        return res.status(400).json({ msg: "Credenciais inválidas" });
      }

      const payload: JwtPayload = {
        user: {
          id: user.id,
          tipoUsuario: user.tipoUsuario, // Incluindo tipoUsuario no payload
        },
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: "1h",
      });

      console.log("Login bem-sucedido para o usuário:", usuario);
      res.status(200).json({ token, tipoUsuario: user.tipoUsuario }); // Incluindo tipoUsuario na resposta
    } catch (error: any) {
      console.error("Erro durante o login:", error.message);
      res.status(500).send("Erro no servidor");
    }
  }
);

export default router;
