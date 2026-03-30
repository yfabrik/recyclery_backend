import bcrypt from "bcryptjs";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare username: string | null;
  declare email: string | null;
  declare password_hash: string | null;
  declare password: string | undefined;
  declare role: string;
  declare phone: string | null;
  declare isActive: boolean;
  declare last_login: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(models: Models) {
    this.hasMany(models.Donation, { foreignKey: "received_by" });
    this.hasMany(models.SalesTransaction, { foreignKey: "created_by" });
    this.hasMany(models.CollectionReceipt, { foreignKey: "processed_by" });
    this.hasMany(models.LabeledItem, { foreignKey: "created_by" });
    this.hasMany(models.Arrival, { foreignKey: "processed_by" });
    this.hasMany(models.Recyclery, { foreignKey: "manager_id", as: "managedStores" });
  }

  static initModel(sequelize: Sequelize) {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        username: { type: DataTypes.STRING, unique: true },
        email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "password",
        },
        password: {
          type: DataTypes.VIRTUAL,
          set(this: User, value: string | undefined) {
            if (value && typeof value === "string") {
              const saltRounds = 10;
              const hashedPassword = bcrypt.hashSync(value, saltRounds);
              this.setDataValue("password_hash", hashedPassword);
            }
          },
          get() {
            return undefined;
          },
        },
        role: { type: DataTypes.STRING, defaultValue: "employee" },
        phone: {
          type: DataTypes.STRING,
          validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
        },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        last_login: DataTypes.DATE,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "User",
        defaultScope: {
          attributes: { exclude: ["password_hash"] },
        },
        scopes: {
          withPassword: {
            attributes: { include: ["password_hash"] },
          },
        },
        hooks: {
          beforeCreate: async (user) => {
            const u = user as User;
            if (u.password_hash && !u.password_hash.startsWith("$2")) {
              const saltRounds = 10;
              u.password_hash = await bcrypt.hash(u.password_hash, saltRounds);
            }
          },
          beforeUpdate: async (user) => {
            const u = user as User;
            if (u.changed("password_hash") && u.password_hash && !u.password_hash.startsWith("$2")) {
              const saltRounds = 10;
              u.password_hash = await bcrypt.hash(u.password_hash, saltRounds);
            }
          },
        },
      },
    );
  }
}
