import express from "express";

import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import {
  closeCashSession,
  getActiveSession,
  listCashSessions,
  openCashSession,
} from "../../controllers/cashSession.js";

export const router = express.Router();

// router.use(authenticateToken);

router.get("/", asyncHandler(listCashSessions));
router.get("/active", asyncHandler(getActiveSession));
router.post("/open", asyncHandler(openCashSession));
router.put("/:id/close", asyncHandler(closeCashSession));
