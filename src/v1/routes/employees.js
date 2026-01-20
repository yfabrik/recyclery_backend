import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from "../controllers/employees.js";

export const router = Router();

router.get("/", authenticateToken, asyncHandler(listEmployees));

router.post("/", authenticateToken, asyncHandler(createEmployee));

router.put("/:id", authenticateToken, asyncHandler(updateEmployee));

router.delete("/:id", authenticateToken, asyncHandler(deleteEmployee));
