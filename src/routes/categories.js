import { Router } from "express";
import db from "../models/index.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
const { Category } = db;

export const router = Router();
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await Category.findAll();
    res.json(categories);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description, icon, parent_id } = req.body;
    const response = await Category.create({ name, description, parent_id });
    res.json(response);
  })
);
