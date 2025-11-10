import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import db from "../models/index.js";
const { Recyclery } = db;

export const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const recycleries = await Recyclery.findAll();
    res.json(recycleries);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = {
      name: "a",
      address: "address",
      phone: "0123456789",
      email: "why@a.com",
    };
    const recyclerie = await Recyclery.create(data);
    res.json(recyclerie);
  })
);

