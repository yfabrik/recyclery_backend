import { Router } from "express";
import {
  createUser,
  deleteUser,
  findUserById,
  listAllUsersInfo,
  listEmployees,
  listUsers,
  updateUser,
  userStats,
} from "../controllers/users.js";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const router = Router();
router.use(authenticateToken);
// Obtenir tous les utilisateurs
router.get("/", asyncHandler(listUsers));

router.get("/all",asyncHandler(listAllUsersInfo))
// Obtenir tous les employés (utilisateurs avec rôles employee, admin, manager)
router.get("/employees", asyncHandler(listEmployees));

router.get(
  "/stats",
  asyncHandler(userStats)
);

// Obtenir les rôles disponibles
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
