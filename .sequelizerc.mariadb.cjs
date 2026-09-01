// CommonJS config for sequelize-cli greenfield MariaDB (future_migrations)
const path = require("path");

module.exports = {
  config: path.resolve("config", "config.json"),
  "models-path": path.resolve("src", "models"),
  "seeders-path": path.resolve("src", "seeders"),
  "migrations-path": path.resolve("src", "future_migrations"),
};
