import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  createEcoOrganism,
  deleteEcoOrganism,
  detailEcoOrganism,
  ecoOrgaStats,
  listActiveEcoOrganism,
  listEcoOrganism,
  updateEcoOrganism,
} from "../controllers/ecoOrganism.js";

export const router = Router();

// GET all eco-organisms
router.get(
  "/",
  authenticateToken,
  //   requireModuleAccess('admin.eco_organisms', 'view'),
  asyncHandler(listEcoOrganism)
);

// GET active eco-organisms only
//TODO query params dans all
router.get("/active", authenticateToken, asyncHandler(listActiveEcoOrganism));

// GET single eco-organism by ID
router.get(
  "/:id",
  authenticateToken,
  //  requireModuleAccess('admin.eco_organisms', 'view'),
  asyncHandler(detailEcoOrganism)
);

// POST create new eco-organism
router.post(
  "/",
  authenticateToken,
  //  requireModuleAccess('admin.eco_organisms', 'manage'),
  asyncHandler(createEcoOrganism)
);

// PUT update eco-organism
router.put(
  "/:id",
  authenticateToken,
  //   requireModuleAccess('admin.eco_organisms', 'manage'),
  asyncHandler(updateEcoOrganism)
);

// DELETE (deactivate) eco-organism
router.delete(
  "/:id",
  authenticateToken,
  // requireModuleAccess('admin.eco_organisms', 'manage'),
  asyncHandler(deleteEcoOrganism)
);

// GET eco-organism statistics
router.get(
  "/stats/summary",
  authenticateToken,
  //  requireModuleAccess('admin.eco_organisms', 'view'),
  asyncHandler(ecoOrgaStats)
);
