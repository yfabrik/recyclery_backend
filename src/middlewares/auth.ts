import createHttpError from "http-errors";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getJwtSecret } from "../config/jwt.js";
import db from "../models/index.js";
import type { RequestHandler } from "express";
import type { RequestWithUser } from "../v1/controllers/types.js";

const { User } = db;

type Token = JwtPayload & {
  id: number;
  username: string;
  email: string;
  role: "employee" | "admin" | "manager";
};

export const authenticateToken: RequestHandler = async (req, _res, next) => {
  const requestWithUser = req as RequestWithUser;
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throw new createHttpError.Unauthorized("Token d'accès requis");
    }

    // Vérifier le token
    const decoded = jwt.verify(token, getJwtSecret()) as Token;

    const userId = decoded.id;

    // Récupérer l'utilisateur
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user || !user.isActive) {
      throw new createHttpError.Unauthorized(
        "Utilisateur non trouvé ou inactif",
      );
    }

    // Ajouter l'utilisateur à la requête
    requestWithUser.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
