import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { createEmployeeVacation, deleteVacation, listEmployeeVacations, listVacations, updateVacation } from "../controllers/vacation.js";

export const router = Router();
router.get(
  "/",
  asyncHandler(listVacations),
);

router.get("/employee/:employeeId", asyncHandler(listEmployeeVacations));

router.post("/employee/:employeeId", asyncHandler(createEmployeeVacation));

router.put(
  "/:id",
  asyncHandler(updateVacation));
    



router.delete(
  "/:id",
  asyncHandler(deleteVacation));

