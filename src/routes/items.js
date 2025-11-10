import { Router } from "express";
import db from "../models/index.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
const { Item } = db;

export const router = Router();
router.get(
  "/",

  asyncHandler(async (req, res) => {
    const items = await Item.findAll();
    res.json(items);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = {
      name: "prout",
      category_id: 2,
    //   barcode,
      purchase_price: 0,
      selling_price: 2.25,
      recyclery_id: 1,
    };
    const response = await Item.create(data);
    res.json(response);
  })
);
