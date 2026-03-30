import { readdirSync } from "fs";
import { basename as _basename, dirname, join } from "path";
import { env as _env } from "process";
import { Model, Sequelize, type Options } from "sequelize";
import { fileURLToPath, pathToFileURL } from "url";
import type { DB } from "./db-types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = _basename(__filename);
const env = _env.NODE_ENV as "development" | "test" | "production" ?? "development";

const configModule = (await import("../../config/config.json", {
  with: { type: "json" },
})) as { default: Record<typeof env, Options & { use_env_variable?: string }> };
const config = configModule.default[env] ?? {};

const db = {} as DB;

const sequelize = config.use_env_variable
  ? new Sequelize(_env[config.use_env_variable] ?? "", config)
  : new Sequelize(config.database ?? "", config.username ?? "", config.password ?? "", config);

const files = readdirSync(__dirname).filter((file) => {
  // Only load concrete model modules; skip our own loader/wrapper files.
  if (file.startsWith(".")) return false;
  if (!file.endsWith(".js")) return false;
  if (file === basename) return false;
  if (file === "db-types.js" || file === "db-types.ts") return false;
  // Prevent importing `src/models/index.js` (or any `index.*.js`) which causes self-references.
  if (file === "index.js" || file.startsWith("index.")) return false;
  if (file.indexOf(".test.ts") !== -1 || file.indexOf(".test.js") !== -1) return false;
  return true;
});

for (const file of files) {
  const modelUrl = pathToFileURL(join(__dirname, file)).href;//await import(join(__dirname, file))
  const mod: { default: Model<any, any> & { initModel: (sequelize: any) => void; name: string; associate: (models: DB) => void } } = await import(modelUrl);
  const modelExport = mod.default;
  modelExport.initModel(sequelize);
  db[modelExport.name] = modelExport;

}

Object.keys(db).forEach((modelName) => {
  const model = (db as unknown as Record<string, { associate?: (models: DB) => void }>)[modelName];
  if (model?.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = (await import("sequelize")).default;

export default db;
