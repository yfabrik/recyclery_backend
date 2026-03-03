import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { login, register, userProfile } from "../controllers/auth.js";
import { authenticateToken } from "../../middlewares/auth.js";
import rateLimit from "express-rate-limit";
import logger from "../../services/logger.js";

export const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limite chaque IP à 1000 requêtes par windowMs (plus permissif)
  message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
  handler: (req, res, next, options) => {
    logger.error("too many request", {
      method: req?.method,
      url: req?.originalUrl,
      status: options.statusCode,
      ip: req?.ip,
      "x-forwarded-for": req.headers["x-forwarded-for"],
      userId: req?.user?.id,
      headers: {
        // Only log non-sensitive headers
        "user-agent": req?.headers?.["user-agent"],
        referer: req?.headers?.referer,
        "x-forwarded-for": req.headers["x-forwarded-for"],
      },
    });
    res.status(options.statusCode).send({
      success: false,
      error: options.message,
      message: options.message,
      status: options.statusCode,
    });
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
