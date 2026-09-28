import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import logger from "../../services/logger.js";
import {
  addEmployeeToSchedule,
  createSchedule,
  deleteSchedule,
  findSchedule,
  getEmployeeSchedule,
  listSchedules,
  planningStats,
  removeEmployeeFromSchedule,
  updateSchedule,
} from "../controllers/taskSchedule.js";

export const router = Router();

// Récupérer tous les plannings
router.get("/", asyncHandler(listSchedules));

// Récupérer un planning par ID
router.get("/:id", asyncHandler(findSchedule));

// Créer un nouveau planning
router.post("/", asyncHandler(createSchedule));

// Mettre à jour un planning
router.put("/:id", asyncHandler(updateSchedule));

// Supprimer un planning
router.delete("/:id", asyncHandler(deleteSchedule));

// Récupérer le planning d'un employé
router.get("/employee/:employee_id", asyncHandler(getEmployeeSchedule));

// Récupérer les statistiques du planning
router.get("/stats/overview", asyncHandler(planningStats));

// Récupérer les employés assignés à une tâche spécifique du planning
// @deprecated stub kept for the deprecated planning routes below; always returns [].
router.get(
  "/:scheduleId/employees",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in planning route FIXME", {
      params: req.params,
      referer: req?.headers?.referer,
    });
    // const { scheduleId } = req.params;

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
  }),
);

// @deprecated Bypasses Time range validation — use POST /api/tasks/:id/employees instead.
router.post("/:scheduleId/employees", asyncHandler(addEmployeeToSchedule));

// @deprecated Bypasses Time range validation — use DELETE /api/tasks/:id/employees/:employeeId instead.
router.delete(
  "/:scheduleId/employees/:employeeId",
  asyncHandler(removeEmployeeFromSchedule),
);
