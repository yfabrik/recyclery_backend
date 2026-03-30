import type { Sequelize } from "sequelize";

export interface DbConfig {
  use_env_variable?: string;
  database?: string;
  username?: string;
  password?: string;
  dialect?: string;
  storage?: string;
  logging?: boolean;
}

export type Models = Record<string, any>;

export type DB = Models & {
  sequelize: Sequelize;
  Sequelize: typeof import("sequelize");
};
