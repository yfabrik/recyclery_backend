import "dotenv/config";

// Ensure civil-day math matches French stores even if host TZ differs.
process.env.TZ ??= "Europe/Paris";

import { assertJwtSecretConfigured } from "./config/jwt.js";
import express from "express";
import db from "./models/index.js";

assertJwtSecretConfigured();
import helmet from "helmet";
import cron from "node-cron";
import { generateFutureTasks } from "./services/taskGenerator.js";
import rateLimit from "express-rate-limit";
import logger from "./services/logger.js";

export const app = express();
app.set("trust proxy", 1 /* number of proxies between user and server */);

let appReady = false;

app.get("/health", async (_req, res) => {
  if (!appReady) {
    return res.status(503).json({ status: "starting" });
  }

  try {
    await db.sequelize.authenticate();
    return res.json({ status: "ok" });
  } catch {
    return res.status(503).json({ status: "unavailable" });
  }
});

app.use(helmet());
app.use(express.json());
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "") || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "") || 1000, // limite chaque IP à 1000 requêtes par windowMs (plus permissif)
  message: {
    error: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
  },
  handler: (req, res, _next, options) => {
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
        all: req.headers,
      },
    });
    res.status(options.statusCode).send(options.message);
  },
  skip: (req, _res) => {
    const ip = req.ip ?? "";
    const whitelist = (process.env.RATE_LIMIT_WHITELIST ?? "")
      .split(",")
      .map((v) => v.trim());

    // Skip rate limiting en développement pour localhost
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      whitelist.includes(ip)
    );
  },
});

app.use("/api/", limiter);

import { router } from "./v1/routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import createHttpError from "http-errors";
import cors from "cors";
app.use(cors());
app.use("/api", router);

// Gestion des routes non trouvées
app.use("*splat", (_req, _res, next) => {
  return next(new createHttpError[404]("Route non trouvée"));
});
app.use(errorHandler);

async function bootstrapDatabase() {
  await db.sequelize.authenticate();
  logger.debug(`node env = ${process.env.NODE_ENV}`)

  const count = await db.User.count();
  if (
    count === 0 &&
    process.env.DEFAULT_USERNAME &&
    process.env.DEFAULT_MAIL &&
    process.env.DEFAULT_PASS
  ) {
    await db.User.create({
      email: process.env.DEFAULT_MAIL,
      username: process.env.DEFAULT_USERNAME,
      password: process.env.DEFAULT_PASS,
      role: "admin",
    });
  }

  appReady = true;
}

app.listen(5000, () => {
  bootstrapDatabase().catch((err) => {
    logger.error("database bootstrap error", err);
    process.exit(1);
  });

  console.log(`server started on http://0.0.0.0:5000`);

  // Schedule task generation cron job
  // Runs daily at 2:00 AM to generate tasks for the next month
  // Cron format: minute hour day month day-of-week
  // "0 2 * * *" = every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      logger.info("Starting scheduled task generation...");
      const result = await generateFutureTasks(db);
      logger.info(
        `Scheduled task generation completed: ${result.created} task(s) created for ${result.schedules} schedule(s)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Error in scheduled task generation: ${errorMessage}`,
        error,
      );
    }
  });

  // Also run immediately on startup to ensure tasks exist
  // (optional - you can remove this if you prefer)
  setTimeout(async () => {
    try {
      logger.info("Running initial task generation on startup...");
      const result = await generateFutureTasks(db);
      logger.info(
        `Initial task generation completed: ${result.created} task(s) created for ${result.schedules} schedule(s)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error in initial task generation: ${errorMessage}`, error);
    }
  }, 5000); // Wait 5 seconds after server start to ensure DB is ready
});
