import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";

import { createEcoOrganism, deleteEcoOrganism, detailEcoOrganism, listActiveEcoOrganism, listEcoOrganism, updateEcoOrganism } from "../../controllers/ecoOrganism.js";

const { EcoOrganism, Sequelize, WasteDisposal } = db;
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
router.get(
  "/active",
  authenticateToken,
  asyncHandler(listActiveEcoOrganism)
);

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
  asyncHandler(async (req, res) => {
    const stats = await EcoOrganism.findAll({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("*")), "active_eco_organisms"],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(`CASE WHEN "is_active"= 1 THEN 1 ELSE 0 END`),
            "active_eco_organisms"
          ),
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(`CASE WHEN "is_active"= 0 THEN 1 ELSE 0 END`),
            "inactive_eco_organisms"
          ),
        ],
      ],
    });

    res.json({ stats });
  })
);
