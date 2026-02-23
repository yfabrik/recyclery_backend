import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

import {
  createDon,
  deleteDon,
  donStats,
  listDons,
  updateDon,
} from "../controllers/donations.js";

export const router = Router();
// Obtenir tous les dons/apports
router.get("/",  asyncHandler(listDons));

// Créer un nouveau don
router.post("/",  asyncHandler(createDon));

// PUT update donation
router.put("/:id",  asyncHandler(updateDon));

router.delete("/:id",  asyncHandler(deleteDon));

// GET donation statistics
router.get("/stats",  asyncHandler(donStats));
