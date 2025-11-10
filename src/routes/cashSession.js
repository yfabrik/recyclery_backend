import { Router } from "express";
import db from "../models/index.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
const { CashRegister, CashSession } = db;

export const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const session = await CashSession.findAll();
    res.json(session);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const session = await CashSession.findByPk(id);
    res.json(session);
  })
);
router.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { money } = req.body;
    const session = await CashSession.findByPk(id);
    session.closing_amount = money;
    await session.save();
    res.json(session);
  })
);

router.get(
  "/:id/sessions",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cashRegister = await CashRegister.findByPk(id, {
      include: [{ model: CashSession, as: "sessions" }],
    });
    res.json(cashRegister);
  })
);
