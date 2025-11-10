import { Router } from "express";
import db from "../models/index.js";
import { authenticateToken } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
const { User, Recyclery } = db;

export const router = Router();
router.get(
  "/",
  //   authenticateToken,
  asyncHandler(async (req, res) => {
    const users = await User.findAll();
    res.json(users);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      include: [
        {
          model: Recyclery,
          as: "recycleries",
        },
      ],
    });
    res.json(user);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      username,
      email,
      password,
      role,
      phone,
      contract_hours,
      recyclery,
    } = req.body;

    const user = {
      username,
      email,
      password,
      role: role || "employee",
      phone: "7894561230",
      contract_hours: contract_hours || 35,
    };
    const response = await User.create(user);
    if (recyclery) response.addRecyclery(recyclery);
    res.json(response);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.destroy({ where: { id: id } });
    res.json(user);
  })
);

router.get(
  "/:id/managed",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      include: [
        {
          model: Recyclery,
          as: "managedStores",
        },
      ],
    });
    res.json(user);
  })
);

router.get(
  "/:id/recycleries",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      include: [
        {
          model: Recyclery,
          as: "recycleries",
        },
      ],
    });
    res.json(user);
  })
);
