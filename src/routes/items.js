import { Router } from "express";
import db from "../../models/index.js";

import { asyncHandler } from "../middlewares/asyncHandler.js";
const { LabeledItem } = db;

export const router = Router();
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await LabeledItem.findAll();
    res.json(items);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = req.body;
    const response = await LabeledItem.create({ data });
    res.json(response);
  }),
);
