"use strict";
import { readdirSync } from "fs";
import { basename as _basename, join, dirname } from "path";
import { fileURLToPath } from "url";
import Sequelize, { DataTypes } from "sequelize";
import { env as _env } from "process";

// Replace __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = _basename(__filename);
const env = _env.NODE_ENV || "development";

// Use dynamic import for JSON files
const configModule = await import(`../../config/config.json`, {
  with: { type: "json" },
});
const config = configModule.default[env];

const db = {};
let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(_env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Dynamically import model files
const files = readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.slice(-3) === ".js" &&
    file.indexOf(".test.js") === -1
  );
});

/**
 * @typedef {import('./user')} User
 * @typedef {import('./recyclery')} Recyclery
 */
for (const file of files) {
  const { default: modelInit } = await import(join(__dirname, file));
  const model = modelInit(sequelize, DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
