import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  createGiftCard,
  createGiftCardCharge,
  createGiftCardRecredit,
  getGiftCardByCode,
  getGiftCardCurrentBalance,
  listGiftCards,
} from "../controllers/giftCards.js";

export const router = Router();

// POST - Create/issue a gift card
router.post("/", asyncHandler(createGiftCard));

// GET - List gift cards
router.get("/", asyncHandler(listGiftCards));

// GET - Find gift card by scan code
router.get("/code/:code", asyncHandler(getGiftCardByCode));

// GET - Compute current balance from ledger
router.get("/:id/balance", asyncHandler(getGiftCardCurrentBalance));

// POST - Register a gift card charge movement
router.post("/:id/charge", asyncHandler(createGiftCardCharge));

// POST - Register a gift card recredit movement
router.post("/:id/recredit", asyncHandler(createGiftCardRecredit));
