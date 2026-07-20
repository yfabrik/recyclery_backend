import "dotenv/config";
import db from "../models/index.js";
import { QueryTypes } from "sequelize";

const EXPECTED_MIGRATION_COUNT = 31;

await db.sequelize.authenticate();
const metaRows = await db.sequelize.query<{ count: number | string }>(
  "SELECT COUNT(*) AS count FROM SequelizeMeta",
  { type: QueryTypes.SELECT },
);
const applied = Number(metaRows[0]?.count ?? 0);
if (applied < EXPECTED_MIGRATION_COUNT) {
  throw new Error(`Expected ${EXPECTED_MIGRATION_COUNT} migrations, got ${applied}`);
}

const users = await db.User.count();
const promotions = await db.Promotion.count();
const joinRows = await db.sequelize.query<{ c: number }>(
  "SELECT COUNT(*) AS c FROM promotion_store",
  { type: QueryTypes.SELECT },
);

console.log(
  JSON.stringify({
    ok: true,
    migrations: applied,
    users,
    promotions,
    promotion_store_rows: joinRows[0]?.c ?? 0,
  }),
);
await db.sequelize.close();
