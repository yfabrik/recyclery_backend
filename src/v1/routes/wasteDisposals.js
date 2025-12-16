import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createWaste,
  deleteWaste,
  detailWaste,
  listWaste,
  updateWaste,
  wasteStats,
  wasteStatsCategory,
} from "../controllers/waste.js";

export const router = Router();
// Helper pour générer un numéro de sortie unique

// GET all waste disposals with filters
router.get("/", authenticateToken, asyncHandler(listWaste));

// GET single waste disposal by ID
router.get(
  "/:id",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "view"),
  asyncHandler(detailWaste)
);

// POST create new waste disposal
router.post("/", authenticateToken, asyncHandler(createWaste));

// PUT update waste disposal
router.put(
  "/:id",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "manage"),
  asyncHandler(updateWaste)
);

// DELETE waste disposal
router.delete(
  "/:id",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "manage"),
  asyncHandler(deleteWaste)
);

// GET waste disposal statistics
router.get(
  "/stats/summary",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "view"),
  asyncHandler(wasteStats)
);

// GET waste disposal statistics by category
router.get(
  "/stats/by-category",
  authenticateToken,
  // requireModuleAccess("waste.disposals", "view"),
  asyncHandler(wasteStatsCategory)
);
