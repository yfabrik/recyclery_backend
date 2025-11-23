import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import db from "../models/index.js";

const { User } = db

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throw new createHttpError.Unauthorized("Token d'accès requis");
    }

    // Vérifier le token
    const decoded =jwt.verify(
      token,
      process.env.JWT_SECRET || "adapemont-secret-key"
    );

    // Récupérer l'utilisateur
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      throw new createHttpError.Unauthorized(
        "Utilisateur non trouvé ou inactif"
      );
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
