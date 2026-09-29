import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import {
  addUserToTask,
  createTask,
  createTimeRange,
  deleteTask,
  deleteTimeRange,
  detailTask,
  getAvailableEmployeesForTask,
  getUsersFromTask,
  listTasks,
  removeUserFromTask,
  updateTask,
  updateTimeRange,
} from "../controllers/tasks.js";

export const router = Router();
// Récupérer toutes les tâches
router.get("/", asyncHandler(listTasks));

// Récupérer une tâche par ID
router.get("/:id", asyncHandler(detailTask));

// Créer une nouvelle tâche
router.post("/", asyncHandler(createTask));

// Mettre à jour une tâche
router.put("/:id", asyncHandler(updateTask));

// Supprimer une tâche
router.delete("/:id", asyncHandler(deleteTask));

// Récupérer les employés assignés à une tâche
router.get("/:taskId/employees", asyncHandler(getUsersFromTask));

// Assigner un employé à une tâche (avec une plage horaire optionnelle)
router.post("/:taskId/employees", asyncHandler(addUserToTask));

// Retirer un employé d'une tâche (ses plages horaires sont supprimées en cascade)
router.delete(
  "/:taskId/employees/:employeeId",
  asyncHandler(removeUserFromTask),
);

// Récupérer les employés disponibles pour une tâche (Store, Workday et Vacation déjà filtrés)
router.get("/:taskId/available-employees", asyncHandler(getAvailableEmployeesForTask));

// Ajouter une plage horaire à une assignation existante
router.post(
  "/:taskId/employees/:employeeId/time-ranges",
  asyncHandler(createTimeRange),
);

// Modifier une plage horaire existante
router.put(
  "/:taskId/employees/:employeeId/time-ranges/:rangeId",
  asyncHandler(updateTimeRange),
);

// Supprimer une plage horaire (supprime l'assignation si c'était la dernière)
router.delete(
  "/:taskId/employees/:employeeId/time-ranges/:rangeId",
  asyncHandler(deleteTimeRange),
);
