import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { login, register, userProfile } from "../controllers/auth.js";
import { authenticateToken } from "../../middlewares/auth.js";
import rateLimit from "express-rate-limit";

export const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limite chaque IP à 1000 requêtes par windowMs (plus permissif)
  message: {
    error: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
  },
  skip: (req) => {
    // Skip rate limiting en développement pour localhost
    return (
      req.ip === "127.0.0.1" ||
      req.ip === "::1" ||
      req.ip === "::ffff:127.0.0.1" ||
      process.env.RATE_LIMIT_WHITELIST?.split(",")
        .map((v) => v.trim())
        ?.includes(req.ip)
    );
  },
});
router.use(limiter);

if (process.env.NODE_ENV != "production")
  router.post("/register", asyncHandler(register));

router.post("/login", asyncHandler(login));

router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

router.get("/profile", authenticateToken, asyncHandler(userProfile));
