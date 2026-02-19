import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import {
  addUserToTask,
  createTask,
  deleteTask,
  detailTask,
  getUsersFromTask,
  listTasks,
  removeUserFromTask,
  updateTask,
} from "../controllers/tasks.js";

export const router = Router();
// Récupérer toutes les tâches
router.get("/", authenticateToken, asyncHandler(listTasks));

// Récupérer une tâche par ID
router.get("/:id", authenticateToken, asyncHandler(detailTask));

// Créer une nouvelle tâche
router.post("/", authenticateToken, asyncHandler(createTask));

// Mettre à jour une tâche
router.put("/:id", authenticateToken, asyncHandler(updateTask));

// Supprimer une tâche
router.delete("/:id", authenticateToken, asyncHandler(deleteTask));

// Récupérer les employés assignés à une tâche
router.get(
  "/:taskId/employees",
  authenticateToken,
  asyncHandler(getUsersFromTask),
);

// Assigner un employé à une tâche
router.post(
  "/:taskId/employees",
  authenticateToken,
  asyncHandler(addUserToTask),
);

// Retirer un employé d'une tâche
router.delete(
  "/:taskId/employees/:employeeId",
  authenticateToken,
  asyncHandler(removeUserFromTask),
);
