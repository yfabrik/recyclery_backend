import { Router } from "express";
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
router.get("/",  asyncHandler(listTasks));

// Récupérer une tâche par ID
router.get("/:id",  asyncHandler(detailTask));

// Créer une nouvelle tâche
router.post("/",  asyncHandler(createTask));

// Mettre à jour une tâche
router.put("/:id",  asyncHandler(updateTask));

// Supprimer une tâche
router.delete("/:id",  asyncHandler(deleteTask));

// Récupérer les employés assignés à une tâche
router.get(
  "/:taskId/employees",
  asyncHandler(getUsersFromTask),
);

// Assigner un employé à une tâche
router.post(
  "/:taskId/employees",
  asyncHandler(addUserToTask),
);

// Retirer un employé d'une tâche
router.delete(
  "/:taskId/employees/:employeeId",
  asyncHandler(removeUserFromTask),
);
