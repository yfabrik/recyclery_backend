import { Router } from "express";

export const router = Router();

router.use("/auth",(await import("./auth.js")).router));

router.use("/users",);
router.use("/donations",);

router.use("/sales",);
router.use("/categories",);
router.use(
    "/collection-points",

);

router.use("/arrivals",);
router.use("/products",);
router.use('/stores',);
router.use("/cash-sessions",);
router.use("/cash-registers",);
router.use(
    "/sales-transactions",

);
router.use('/refunds',);
router.use('/eco-organisms',);
router.use('/waste-disposals',);
router.use('/dashboard',);
router.use('/tasks',);
router.use('/planning',);



router.use('/employee-workdays',);
router.use("/employee-stores",);