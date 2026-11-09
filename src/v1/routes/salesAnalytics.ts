import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { salesAnalyticsKpis } from "../controllers/salesAnalytics/kpis.js";

/** Mounted at `/sales-transactions/analytics`, before `/:id`. */
export const router = Router();

router.get("/kpis", asyncHandler(salesAnalyticsKpis));
