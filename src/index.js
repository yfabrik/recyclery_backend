import express from "express";
import db from "./models/index.js";
import "dotenv/config";
import helmet from "helmet";

export const app = express();
app.use(helmet())
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
  db.sequelize.sync();

  // db.sequelize.sync({ force: true });

  console.log(`server started on http://0.0.0.0:5000`);
});
