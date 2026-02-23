import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from "../controllers/employees.js";

export const router = Router();

router.get("/",  asyncHandler(listEmployees));

router.post("/",  asyncHandler(createEmployee));

router.put("/:id",  asyncHandler(updateEmployee));

router.delete("/:id",  asyncHandler(deleteEmployee));
