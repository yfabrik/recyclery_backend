import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { createPromotion, deletePromotion, listPromotions, updatePromotion } from "../controllers/promotions.js";

export const router = Router();

router.get("/", asyncHandler(listPromotions))
router.post("/", asyncHandler(createPromotion))
router.put("/:id", asyncHandler(updatePromotion))
router.delete("/:id", asyncHandler(deletePromotion))

