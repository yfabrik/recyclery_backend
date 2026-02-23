import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
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

// GET all waste disposals with filters
router.get("/",  asyncHandler(listWaste));

// GET single waste disposal by ID
router.get(
  "/:id",
  asyncHandler(detailWaste),
);

// POST create new waste disposal
router.post("/",  asyncHandler(createWaste));

// PUT update waste disposal
router.put(
  "/:id",
  asyncHandler(updateWaste),
);

// DELETE waste disposal
router.delete(
  "/:id",
  asyncHandler(deleteWaste),
);

// GET waste disposal statistics
router.get(
  "/stats/summary",
  asyncHandler(wasteStats),
);

// GET waste disposal statistics by category
router.get(
  "/stats/by-category",
  asyncHandler(wasteStatsCategory),
);
