import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { findUserById, listUsers } from "../controllers/users.js";
import { assignUserToStore, getEmployeeStoreById, listEmployeeStore, listStoreEmployee, removeEmployeeStore } from "../controllers/employee_store.js";
const { User,  Recyclery } = db;

export const router = Router();
// router.use(authenticateToken);
// Obtenir toutes les affectations employés-magasins
router.get(
  "/",
  authenticateToken,
  asyncHandler(listEmployeeStore)
);

// Obtenir les affectations d'un employé
router.get(
  "/employee/:employeeId",
  authenticateToken,
  asyncHandler(
    getEmployeeStoreById
  ));

// Obtenir les employés d'un magasin
router.get(
  "/store/:storeId",
  authenticateToken,
  asyncHandler(listStoreEmployee)
);

// Créer une nouvelle affectation
router.post(
  "/",
  authenticateToken,
  asyncHandler(assignUserToStore)
);

// Mettre à jour une affectation
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { is_primary } = req.body;

  // Si c'est une affectation principale, retirer le statut principal des autres affectations de cet employé
  //   if (is_primary) {
  //     const assignment = await database.query(
  //       "SELECT employee_id FROM employee_stores WHERE id = ?",
  //       [id]
  //     );
  //     if (assignment.length > 0) {
  //       await database.run(
  //         "UPDATE employee_stores SET is_primary = 0 WHERE employee_id = ? AND id != ?",
  //         [assignment[0].employee_id, id]
  //       );
  //     }
  //   }

  //   const result = await database.run(
  //     `
  //       UPDATE employee_stores
  //       SET is_primary = ?, updated_at = datetime('now')
  //       WHERE id = ?
  //     `,
  //     [is_primary ? 1 : 0, id]
  //   );

  //   if (result.changes === 0) {
  //     return res.status(404).json({
  //       success: false,
  //       error: "Affectation non trouvée",
  //     });
  //   }

  res.json({
    success: true,
    message: "Affectation mise à jour avec succès",
  });
});

// Supprimer une affectation
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  //   const result = await database.run(
  //     "DELETE FROM employee_stores WHERE id = ?",
  //     [id]
  //   );

  //   if (result.changes === 0) {
  //     return res.status(404).json({
  //       success: false,
  //       error: "Affectation non trouvée",
  //     });
  //   }

  res.json({
    success: true,
    message: "Affectation supprimée avec succès",
  });
});

// Supprimer toutes les affectations d'un employé
router.delete(
  "/employee/:employeeId",
  authenticateToken,
  asyncHandler(removeEmployeeStore)
);
