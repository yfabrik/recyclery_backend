import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

import {
  createDon,
  donStats,
  listDons,
  updateDon,
} from "../controllers/donations.js";

export const router = Router();
// Obtenir tous les dons/apports
router.get("/", authenticateToken, asyncHandler(listDons));

// Créer un nouveau don
router.post("/", authenticateToken, asyncHandler(createDon));

// PUT update donation
router.put("/:id", authenticateToken, asyncHandler(updateDon));

// GET donation statistics
router.get("/stats", authenticateToken, asyncHandler(donStats));
