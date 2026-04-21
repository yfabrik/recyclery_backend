import createHttpError from "http-errors";
import jwt, { type JwtPayload } from "jsonwebtoken";
import db from "../models/index.js";
import type { RequestHandler } from "express";
import type { RequestWithUser } from "../v1/controllers/types.js";

const { User } = db;


export const authenticateToken: RequestHandler = async (req, _res, next) => {
  const requestWithUser = req as RequestWithUser;
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throw new createHttpError.Unauthorized("Token d'accès requis");
    }

    // Vérifier le token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "adapemont-secret-key",
    );

    if (typeof decoded === "string" || !("id" in decoded))
      throw new createHttpError.Unauthorized("Token invalide");

    const userId = (decoded as JwtPayload & { id: number | string }).id;

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
