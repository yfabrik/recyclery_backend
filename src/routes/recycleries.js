import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import db from "../../models/index.js";

const { Recyclery, User, CashRegister } = db;

export const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const recycleries = await Recyclery.findAll();
    res.json(recycleries);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const recycleries = await Recyclery.findByPk(id, {
      include: [
        { model: User, as: "employees" },
        { model: User, as: "manager" },
      ],
    });
    res.json(recycleries);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, address, phone, email } = req.body;
    const recyclerie = await Recyclery.create({ name, address, phone, email });
    res.json(recyclerie);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const recycleries = await Recyclery.findByPk(id);
    res.json(recycleries);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const recycleries = await Recyclery.destroy({ where: { id: id } });
    res.json(recycleries);
  }),
);

/////// employee part //////////
router.get(
  "/:id/employees",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const users = await Recyclery.findByPk(id, {
      include: [{ model: User, as: "employees" }],
    });
    res.json(users.employees);
  }),
);

router.post(
  "/:id/employees",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { employeeId } = req.body; // expects { employeeId: number }
    const recyclerie = await Recyclery.findByPk(id);
    await recyclerie.addEmployee(employeeId);
    res.json(recyclerie);
  }),
);

router.delete(
  "/:id/employees/:userId",
  asyncHandler(async (req, res) => {
    const { id, userId } = req.params;

    const users = await Recyclery.findByPk(id, {
      include: [{ model: User, as: "employees" }],
    });
    await users.removeEmployee(userId);

    res.json(users);
  }),
);

router.get(
  "/:id/manager",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const users = await Recyclery.findByPk(id, {
      include: [{ model: User, as: "manager" }],
    });
    res.json(users);
  }),
);

router.post(
  "/:id/manager",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { employeeId } = req.body; // expects { employeeId: number }
    const manager = await User.findByPk(employeeId);

    const recyclerie = await Recyclery.findByPk(id);
    await recyclerie.setManager(manager);

    res.json(recyclerie);
  }),
);

////////// caisse part ////////
router.get(
  "/:id/caisses",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const caisses = await Recyclery.findByPk(id, {
      include: [{ model: CashRegister, as: "caisses" }],
    });
    res.json(caisses);
  }),
);

router.post(
  "/:id/caisses",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const caisse = await CashRegister.create({ name, recyclery_id: id });

    res.json(caisse);
  }),
);
