import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { fn } from "sequelize";
import { createDon,  listDons, updateDon } from "../../controllers/donations.js";

const { Donation} = db;
export const router = Router();
// Obtenir tous les dons/apports
router.get(
  "/",
  authenticateToken,
  asyncHandler(listDons)
);

// Créer un nouveau don
router.post(
  "/",
  authenticateToken,
  asyncHandler(createDon)
);

// PUT update donation
router.put(
  "/:id",
  authenticateToken,
  asyncHandler(updateDon)
);

// GET donation statistics
router.get(
  "/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await Donation.findOne({
      attributes: [
        [fn("COUNT", col("*")), "total_donations"][
          (fn("SUM", where(col("status"), "=", "pending")), "pending_donations")
        ],
        [
          fn("SUM", where(col("status"), "=", "accepted")),
          "accepted_donations",
        ],
        [
          fn("SUM", where(col("status"), "=", "rejected")),
          "rejected_donations",
        ],
        [fn("SUM", col("estimated_value")), "total_estimated_value"],
      ],
      raw: true,
    });

    res.json({ stats });
  })
);
