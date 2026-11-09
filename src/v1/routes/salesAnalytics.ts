import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { salesAnalyticsKpis } from "../controllers/salesAnalytics/kpis.js";
import { salesAnalyticsDiscounts } from "../controllers/salesAnalytics/discounts.js";

/** Mounted at `/sales-transactions/analytics`, before `/:id`. */
export const router = Router();

router.get("/kpis", asyncHandler(salesAnalyticsKpis));
router.get("/discounts", asyncHandler(salesAnalyticsDiscounts));
