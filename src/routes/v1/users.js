import { Router } from "express";
import {
  createUser,
  deleteUser,
  findUserById,
  listEmployees,
  listUsers,
  updateUser,
} from "../../controllers/users.js";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import db from "../../models/index.js";
import { fn, Op } from "sequelize";
const { User } = db;

export const router = Router();
router.use(authenticateToken);
// Obtenir tous les utilisateurs
router.get("/", asyncHandler(listUsers));

// Obtenir tous les employés (utilisateurs avec rôles employee, admin, manager)
router.get("/employees", asyncHandler(listEmployees));

// Obtenir un utilisateur par ID
router.get("/:id", asyncHandler(findUserById));

// Créer un nouvel utilisateur
router.post("/", asyncHandler(createUser));

// Mettre à jour un utilisateur
router.put("/:id", asyncHandler(updateUser));

// Supprimer un utilisateur
router.delete("/:id", asyncHandler(deleteUser));

// Obtenir les rôles disponibles
router.get("/roles", async (req, res) => {
  try {
    const roles = [
      { value: "admin", label: "Administrateur" },
      { value: "manager", label: "Gestionnaire" },
      { value: "employee", label: "Employé" },
    ];

    res.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Erreur récupération des rôles:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des rôles",
      error: error.message,
    });
  }
});

// Obtenir les statistiques des utilisateurs
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const totalUsers = await User.count();
    // Statistiques générales des utilisateurs

    const usersByRole = await User.findAll({
      attributes: ["role", [fn("COUNT", col("*")), "count"]],
      group: ["role"],
      raw: true,
    });

    // Statistiques des connexions récentes (dernières 30 jours)
    const recentLogins = await User.count({
      where: {
        last_login: { [Op.gte]: new Date(new Date().setDate(1)) },
      },
    });

    // Statistiques des employés actifs
    const activeEmployees = await User.count({
      where: { role: { [Op.in]: ["employee", "manager", "admin"] } },
    });

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers[0]?.count || 0,
        usersByRole: usersByRole,
        recentLogins: recentLogins[0]?.count || 0,
        activeEmployees: activeEmployees[0]?.count || 0,
      },
    });
  })
);
