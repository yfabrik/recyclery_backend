import db from "../src/models/index.js"; // adjust path to your models

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

// afterAll(async () => {
//   await db.sequelize.close();
// });
