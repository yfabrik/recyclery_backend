import { Router } from "express";
import db from "../models";
import { authenticateToken } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { where } from "sequelize";

const { Arrival, User } = db;

const router = Router();

/**
 * @param {import('../models').User} User
 */
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { date_from, date_to, category_id, source_type, status } = req.query;
    Arrival.findAll({ include: Category });
  })
);
