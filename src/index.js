import express from "express";
import db from "./models/index.js";

const app = express();

const recycleryRouter = app.use(express.json());

app.use("/api/users", (await import("./routes/users.js")).router);
app.use("/api/recycleries", (await import("./routes/recycleries.js")).router);
app.use("/api/categories", (await import("./routes/categories.js")).router);
app.use("/api/items", (await import("./routes/items.js")).router);
app.use("/api/caisses", (await import("./routes/cashRegister.js")).router);
app.use("/api/sessions", (await import("./routes/cashSession.js")).router);



app.listen(3000, () => {
  db.sequelize.sync({ alter: true });
  console.log(`server started on http://0.0.0.0:3000`);
});
