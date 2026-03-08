import express from "express";

import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  closeCashSession,
  getActiveSession,
  getRegistersByStore,
  getSessionById,
  listCashSessions,
  openCashSession,
  sessionsStats,
} from "../controllers/cashSession.js";

export const router = express.Router();


router.get("/", asyncHandler(listCashSessions));
router.get("/active", asyncHandler(getActiveSession));
router.post("/open", asyncHandler(openCashSession));
router.put("/:id/close", asyncHandler(closeCashSession));
router.get("/store/:store_id/registers", asyncHandler(getRegistersByStore));
router.get("/stats", asyncHandler(sessionsStats));
router.get("/:id", asyncHandler(getSessionById));
