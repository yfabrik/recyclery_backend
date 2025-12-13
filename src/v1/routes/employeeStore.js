import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { findUserById, listUsers } from "../controllers/users.js";
const { User,  Recyclery } = db;

export const router = Router();
router.use(authenticateToken);
// Obtenir toutes les affectations employés-magasins
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const assignments = await User.findAll({
      include: [{ model: Recyclery, as: "recycleries" }],
    });
    res.json({
      success: true,
      assignments,
    });
  })
);

// Obtenir les affectations d'un employé
router.get(
  "/employee/:employeeId",
  authenticateToken,
  asyncHandler(
    findUserById
  ));

// Obtenir les employés d'un magasin
router.get(
  "/store/:storeId",
  authenticateToken,
  asyncHandler(listUsers)
);

// Créer une nouvelle affectation
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { employee_id, store_id, is_primary = false } = req.body;

    if (!employee_id || !store_id) {
      return res.status(400).json({
        success: false,
        error: "employee_id et store_id sont requis",
      });
    }

    // Vérifier que l'employé et le magasin existent
    const employee = await User.findByPk(employee_id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employé non trouvé",
      });
    }
    const store = await Recyclery.findByPk(store_id);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: "Magasin non trouvé",
      });
    }

    // // Si c'est une affectation principale, retirer le statut principal des autres affectations de cet employé
    // if (is_primary) {
    //   await database.run(
    //     "UPDATE employee_stores SET is_primary = 0 WHERE employee_id = ?",
    //     [employee_id]
    //   );
    // }

    await employee.addRecyclery(store_id);

    // const result = await database.run(
    //   `
    //   INSERT INTO employee_stores (employee_id, store_id, is_primary, created_at, updated_at)
    //   VALUES (?, ?, ?, datetime('now'), datetime('now'))
    // `,
    //   [employee_id, store_id, is_primary ? 1 : 0]
    // );

    res.status(201).json({
      success: true,
      message: "Affectation créée avec succès",
      assignment_id: employee.id,
    });
  })
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
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const employee = await User.findByPk(employeeId);
    employee.removeRecycleries();

    // const result = await EmployeeStore.destroy(employeeId);

    res.json({
      success: true,
      message: ` affectation(s) supprimée(s) avec succès`,
    });
  })
);
