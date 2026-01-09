import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import { addEmployeeToSchedule, createSchedule, deleteSchedule, findAvailableEMployee, findSchedule, getEmployeeSchedule, listSchedules, planningStats, removeEmployeeFromSchedule, updateSchedule } from "../controllers/taskSchedule.js";

export const router = Router();

// Récupérer tous les plannings
router.get(
  "/",
  authenticateToken,
  asyncHandler(listSchedules)
);

// Récupérer un planning par ID
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(findSchedule)
);

// Créer un nouveau planning
router.post(
  "/",
  authenticateToken,
  //  requireRole(['admin', 'manager']),
  asyncHandler(createSchedule)
);

// Mettre à jour un planning
router.put(
  "/:id",
  authenticateToken,
  //   requireRole(["admin", "manager"]),
  asyncHandler(updateSchedule)
);

// Supprimer un planning
router.delete(
  "/:id",
  authenticateToken,
  //   requireRole(["admin", "manager"]),
  asyncHandler(deleteSchedule)
);

// Récupérer le planning d'un employé
router.get(
  "/employee/:employee_id",
  authenticateToken,
  asyncHandler(getEmployeeSchedule)
);

// Récupérer les statistiques du planning
router.get(
  "/stats/overview",
  authenticateToken,
  asyncHandler(planningStats)
);

// Récupérer les employés assignés à une tâche spécifique du planning
router.get(
  "/:scheduleId/employees",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;

    // const query = `
    //   SELECT u.id, u.username, u.role, u.email
    //   FROM users u
    //   INNER JOIN task_schedule_employees tse ON u.id = tse.employee_id
    //   WHERE tse.schedule_id = ?
    // `;

    // const employees = await    database.query(query, [scheduleId]);

    res.json({
      success: true,
      employees: [],
    });
  })
);

// Assigner un employé à une tâche spécifique du planning
router.post(
  "/:scheduleId/employees",
  authenticateToken,
  asyncHandler(addEmployeeToSchedule)
);

// Récupérer les employés disponibles pour une tâche spécifique (en tenant compte des conflits d'horaires)
router.get(
  "/:scheduleId/available-employees",
  authenticateToken,
  asyncHandler(findAvailableEMployee)
);

// Retirer un employé d'une tâche spécifique du planning
router.delete(
  "/:scheduleId/employees/:employeeId",
  authenticateToken,
  asyncHandler(removeEmployeeFromSchedule)
);
