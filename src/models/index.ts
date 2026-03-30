import { readdirSync } from "fs";
import { basename as _basename, dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import SequelizeDefault from "sequelize";
import { DataTypes } from "sequelize";
import { env as _env } from "process";
import type { DB, DbConfig } from "./db-types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = _basename(__filename);
const env = _env.NODE_ENV ?? "development";

const configModule = (await import("../../config/config.json", {
  with: { type: "json" },
})) as { default: Record<string, DbConfig> };
const config = configModule.default[env] ?? {};

const db = {} as DB;

const sequelize = config.use_env_variable
  ? new (SequelizeDefault as any)(_env[config.use_env_variable] ?? "", config)
  : new (SequelizeDefault as any)(config.database ?? "", config.username ?? "", config.password ?? "", config);

const files = readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.endsWith(".ts") &&
    file.indexOf(".test.ts") === -1 &&
    file !== "db-types.ts"
  );
});

for (const file of files) {
  const modelUrl = pathToFileURL(join(__dirname, file)).href;
  const mod = await import(modelUrl);
  const modelExport = mod.default as
    | { initModel?: (sequelize: any) => void; name: string; associate?: (models: DB) => void }
    | ((sequelize: any, dataTypes: typeof DataTypes) => { name: string; associate?: (models: DB) => void });

  if (typeof modelExport === "function" && "initModel" in modelExport && modelExport.initModel) {
    (modelExport as any).initModel(sequelize);
    (db as unknown as Record<string, unknown>)[modelExport.name] = modelExport;
  } else if (typeof modelExport === "function") {
    const initialized = (modelExport as any)(sequelize, DataTypes);
    (db as unknown as Record<string, unknown>)[initialized.name] = initialized;
  }
}

Object.keys(db).forEach((modelName) => {
  const model = (db as unknown as Record<string, { associate?: (models: DB) => void }>)[modelName];
  if (model?.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = SequelizeDefault;

export default db;
