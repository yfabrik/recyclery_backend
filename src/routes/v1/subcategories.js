import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { Op } from "sequelize";
const { Category } = db;

export const router = Router();
router.use(authenticateToken);
// Obtenir toutes les sous-catégories
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const subcategories = await Category.findAll({
      where: { parent_id: { [Op.ne]: null } },
    });

    res.json({
      success: true,
      subcategories,
    });
  })
);
