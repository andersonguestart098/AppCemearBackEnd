import { User } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: User; // Defina a propriedade `user` no tipo Request
    }
  }
}

interface JwtPayload {
  user: {
    id: number;
    usuario: string;
    password: string;
    tipoUsuario: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface AuthRequest extends Request {
  user?: JwtPayload["user"];
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
