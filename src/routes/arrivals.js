import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import db from  "../../models/index.js"

const { Arrival } = db;

export const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const arrivals = await Arrival.findAll();
    res.json(arrivals);
  })
);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const arrival = await Arrival.create({
      //     category_id,
      // subcategory_id,
      weight: 10,
      arrival_date: () => Date.now(),
    //   arrival_time,
      source_type,
      source_details,
      collection_point_id,
      collection_point_name,
      collection_point_address,
      volunteer_donation,
      house_clearance,
      notes,
    });
  })
);
