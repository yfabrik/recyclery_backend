import { UserInstance } from "./User";

export interface DbModels {
  User: typeof import("./User").User;
}

declare const models: DbModels;
export default models;
