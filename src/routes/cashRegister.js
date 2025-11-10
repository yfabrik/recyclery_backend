import { Router } from "express";
import db from "../models/index.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
const { CashRegister, CashSession } = db;

export const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cashRegister = await CashRegister.findAll();
    res.json(cashRegister);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cashRegister = await CashRegister.findByPk(id, {
      include: [{ model: CashSession, as: "sessions" }],
    });
    res.json(cashRegister);
  })
);
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cashRegister = await CashRegister.destroy({ where: { id: id } });
    res.json(cashRegister);
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

router.post(
  "/:id/sessions",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { money } = req.body;
    const caisse = await CashRegister.findByPk(id);
    const session = await CashSession.create({
      cash_register_id: caisse.id,
      opening_amount: money,
    });
    await caisse.addSession(session);

    res.json(session);
  })
);
