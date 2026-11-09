import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { salesAnalyticsKpis } from "../controllers/salesAnalytics/kpis.js";
import { salesAnalyticsPostalCodes } from "../controllers/salesAnalytics/postalCodes.js";
import { salesAnalyticsHeatmap } from "../controllers/salesAnalytics/heatmap.js";
import { salesAnalyticsPaymentMethods } from "../controllers/salesAnalytics/paymentMethods.js";
import { salesAnalyticsStores } from "../controllers/salesAnalytics/stores.js";

/** Mounted at `/sales-transactions/analytics`, before `/:id`. */
export const router = Router();

router.get("/kpis", asyncHandler(salesAnalyticsKpis));
router.get("/postal-codes", asyncHandler(salesAnalyticsPostalCodes));
router.get("/heatmap", asyncHandler(salesAnalyticsHeatmap));
router.get("/payment-methods", asyncHandler(salesAnalyticsPaymentMethods));
router.get("/stores", asyncHandler(salesAnalyticsStores));
