import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { col, fn } from "sequelize";
import { createDon, listDons, updateDon } from "../../controllers/donations.js";

const { Donation ,Sequelize} = db;
export const router = Router();
// Obtenir tous les dons/apports
router.get("/", authenticateToken, asyncHandler(listDons));

// Créer un nouveau don
router.post("/", authenticateToken, asyncHandler(createDon));

// PUT update donation
router.put("/:id", authenticateToken, asyncHandler(updateDon));

// GET donation statistics
router.get(
  "/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await Donation.findOne({
      attributes: [
        [fn("COUNT", col("*")), "total_donations"],
        [
          fn(
            "SUM",
            Sequelize.literal(
              `CASE WHEN "status" = 'pending' THEN 1 ELSE 0 END`
            )
          ),
          "pending_donations",
        ],
        [
          fn(
            "SUM",
            Sequelize.literal(
              `CASE WHEN "status" = 'accepted' THEN 1 ELSE 0 END`
            )
          ),
          "accepted_donations",
        ],
        [
          fn(
            "SUM",
            Sequelize.literal(
              `CASE WHEN "status" = 'rejected' THEN 1 ELSE 0 END`
            )
          ),
          "rejected_donations",
        ],
        [fn("SUM", col("estimated_value")), "total_estimated_value"],
      ],
      raw: true,
    });

    res.json({ stats });
  })
);
