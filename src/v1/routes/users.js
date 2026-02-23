import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createUser,
  deleteUser,
  findUserById,
  listUsers,
  updatePassword,
  updateUser,
  userStats,
} from "../controllers/users.js";

export const router = Router();
router.get("/", asyncHandler(listUsers));
router.get("/stats", asyncHandler(userStats));
router.get("/roles", (req, res) => {
  const roles = [
    { name: "admin", display_name: "Administrateur" },
    { name: "manager", display_name: "Gestionnaire" },
    { name: "employee", display_name: "Employé" },
  ];

  res.json({
    success: true,
    roles,
  });
});
// Obtenir un utilisateur par ID
router.get("/:id", asyncHandler(findUserById));

// Créer un nouvel utilisateur
router.post("/", asyncHandler(createUser));

// Mettre à jour un utilisateur
router.put("/:id", asyncHandler(updateUser));

// Supprimer un utilisateur
router.delete("/:id", asyncHandler(deleteUser));

// Obtenir les statistiques des utilisateurs
router.patch("/:id/password", asyncHandler(updatePassword));
