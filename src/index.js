import express from "express";
import db from "./models/index.js";
import "dotenv/config";
import helmet from "helmet";
import cron from "node-cron";
import { generateFutureTasks } from "./services/taskGenerator.js";
import logger from "./services/logger.js";

export const app = express();
app.use(helmet());
app.use(express.json());

import { router } from "./v1/routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import createHttpError from "http-errors";
import cors from "cors";
app.use(cors());
app.use("/api", router);

// Gestion des routes non trouvées
app.use("*splat", (req, res, next) => {
  return next(new createHttpError[404]("Route non trouvée"));
});
app.use(errorHandler);

app.listen(5000, () => {
  db.sequelize
    .sync()
    .then(async () => {
      const count = await db.User.count();
      if (
        count == 0 &&
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
        return;
      }
    })
    .catch((err) => logger.error("sync error", err));

  // db.sequelize.sync({ force: true });

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
        `Scheduled task generation completed: ${result.created} task(s) created for ${result.schedules} schedule(s)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in scheduled task generation: ${errorMessage}`, error);
    }
  });

  // Also run immediately on startup to ensure tasks exist
  // (optional - you can remove this if you prefer)
  setTimeout(async () => {
    try {
      logger.info("Running initial task generation on startup...");
      const result = await generateFutureTasks(db);
      logger.info(
        `Initial task generation completed: ${result.created} task(s) created for ${result.schedules} schedule(s)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in initial task generation: ${errorMessage}`, error);
    }
  }, 5000); // Wait 5 seconds after server start to ensure DB is ready
});
