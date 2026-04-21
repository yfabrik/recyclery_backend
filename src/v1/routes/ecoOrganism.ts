import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createEcoOrganism,
  deleteEcoOrganism,
  detailEcoOrganism,
  ecoOrgaStats,
  ecoOrgQuarterStats,
  listEcoOrganism,
  updateEcoOrganism,
} from "../controllers/ecoOrganism.js";

export const router = Router();

// GET all eco-organisms
router.get("/", asyncHandler(listEcoOrganism));

// GET single eco-organism by ID
router.get("/:id", asyncHandler(detailEcoOrganism));

// POST create new eco-organism
router.post("/", asyncHandler(createEcoOrganism));

// PUT update eco-organism
router.put("/:id", asyncHandler(updateEcoOrganism));

// DELETE (deactivate) eco-organism
router.delete("/:id", asyncHandler(deleteEcoOrganism));

// GET eco-organism statistics
router.get("/stats/summary", asyncHandler(ecoOrgaStats));

router.get("/stats/quarters", asyncHandler(ecoOrgQuarterStats));
