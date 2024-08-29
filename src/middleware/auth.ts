import { User } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Declaração global para adicionar a propriedade `user` ao tipo Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string; // Altere para string para MongoDB
        usuario: string;
        password: string;
        tipoUsuario: string;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

// Ajuste da interface JwtPayload
interface JwtPayload {
  user: {
    id: string; // Altere para string para MongoDB
    usuario: string;
    password: string;
    tipoUsuario: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Atualização da interface AuthRequest
interface AuthRequest extends Request {
  user?: {
    id: string; // Altere para string para MongoDB
    usuario: string;
    password: string;
    tipoUsuario: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ msg: "Sem token, autorização negada" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token inválido" });
  }
};

export default auth;
