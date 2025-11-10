import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { login, register } from "../controllers/auth.js";

export const router = Router();

router.post("/register", asyncHandler(register));

router.post("/login", asyncHandler(login));
