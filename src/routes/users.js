import { Router } from "express";
import db from "../models/index.js";
import { authenticateToken } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
const { User } = db;

export const router = Router();
router.get(
  "/",
  //   authenticateToken,
  asyncHandler(async (req, res) => {
    const { store_id } = req.query;
    const users = await User.findAll({ include: ["Recyclery"] });
    res.json(users);
    // User.findAll({
    //   include: [
    //     {
    //       model: Recyclery,
    //       attributes: [], // already selected via Sequelize.col()
    //       required: false, // LEFT JOIN
    //     },
    //     {
    //       model: EmployeeStore,
    //       attributes: [], // not selecting fields
    //       required: true, // INNER JOIN
    //       where: { store_id: storeId },
    //     },
    //     {
    //       model: TaskScheduleEmployee,
    //       attributes: [],
    //       required: false, // LEFT JOIN
    //     },
    //   ],
    // });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {

    const user = {
      username: "mr t",
      email: "t@example.com",
      password: "aaaaaa",
      role: "employee",
      phone: "7894561230",
      contract_hours: 35,
    };
    const response = await User.create(user);
    res.json(response);
  })
);
