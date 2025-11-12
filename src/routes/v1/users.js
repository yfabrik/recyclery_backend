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
router.get("/stats", async (req, res) => {
  try {
    await database.connect();

    // Statistiques générales des utilisateurs
    const totalUsers = await database.query(
      "SELECT COUNT(*) as count FROM users"
    );
    const usersByRole = await database.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);

    // Statistiques des connexions récentes (dernières 30 jours)
    const recentLogins = await database.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE last_login >= datetime('now', '-30 days')
    `);

    // Statistiques des employés actifs
    const activeEmployees = await database.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role IN ('employee', 'manager', 'admin')
    `);

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers[0]?.count || 0,
        usersByRole: usersByRole,
        recentLogins: recentLogins[0]?.count || 0,
        activeEmployees: activeEmployees[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Erreur récupération des statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: error.message,
    });
  }
});
