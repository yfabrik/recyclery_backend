import { Router } from "express";
import {
  createUser,
  deleteUser,
  findUserById,
  listEmployees,
  listUsers,
  updateUser,
} from "../controllers/users.js";
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
        last_login: {
          [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Statistiques des employés actifs
    const activeEmployees = await User.count({
      where: { role: { [Op.in]: ["employee", "manager", "admin"] } },
    });

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers,
        usersByRole: usersByRole,
        recentLogins: recentLogins,
        activeEmployees: activeEmployees,
      },
    });
  })
);

// Obtenir les rôles disponibles
router.get("/roles", (req, res) => {
  const roles = [
    { value: "admin", label: "Administrateur" },
    { value: "manager", label: "Gestionnaire" },
    { value: "employee", label: "Employé" },
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
