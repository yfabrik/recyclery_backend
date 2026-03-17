import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createEmployee,
  deleteEmployee,
  detailEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeSkills,
} from "../controllers/employees.js";

export const router = Router();

router.get("/",  asyncHandler(listEmployees));

router.get("/:id",  asyncHandler(detailEmployee));

router.post("/",  asyncHandler(createEmployee));

router.put("/:id",  asyncHandler(updateEmployee));

router.put("/:id/skills",  asyncHandler(updateEmployeeSkills));

router.delete("/:id",  asyncHandler(deleteEmployee));
