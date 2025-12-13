import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { login, register, userProfile } from "../controllers/auth.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = Router();

router.post("/register", asyncHandler(register));

router.post("/login", asyncHandler(login));

router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

router.get("/profile", authenticateToken, asyncHandler(userProfile));
