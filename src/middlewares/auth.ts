import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import db from "../models/index.js";
import type { NextFunction, Response } from "express";
import type { RequestWithUser } from "../v1/controllers/types.js";

const { User } = db;


export const authenticateToken = async (req:RequestWithUser, _res:Response, next:NextFunction) => {
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

    // Récupérer l'utilisateur
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user || !user.isActive) {
      throw new createHttpError.Unauthorized(
        "Utilisateur non trouvé ou inactif",
      );
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
