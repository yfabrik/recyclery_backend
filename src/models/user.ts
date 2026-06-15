import bcrypt from "bcryptjs";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyAddAssociationsMixin,
  type HasManyGetAssociationsMixin,
  type HasManySetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type Arrival from "./arrival.ts";
import type { ModelStatics } from "./db-types.ts";
import type Donation from "./donation.ts";
import type LabeledItem from "./labeleditem.ts";
import type Recyclery from "./recyclery.ts";
import type SalesTransaction from "./salestransaction.ts";
import { USER_ROLES, type UserRole } from "../constants/dbEnums.js";

export default class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;
  declare username: string;
  declare email: string;
  declare password_hash: string | null;
  declare password: string | undefined;
  declare role: CreationOptional<UserRole>;
  declare phone: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare last_login: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Donations?: NonAttribute<Donation[]>;
  declare SalesTransactions?: NonAttribute<SalesTransaction[]>;
  declare LabeledItems?: NonAttribute<LabeledItem[]>;
  declare Arrivals?: NonAttribute<Arrival[]>;
  declare managedStores?: NonAttribute<Recyclery[]>;

  declare getDonations: HasManyGetAssociationsMixin<Donation>;
  declare addDonation: HasManyAddAssociationMixin<Donation, Donation["id"]>;
  declare getSalesTransactions: HasManyGetAssociationsMixin<SalesTransaction>;
  declare addSalesTransaction: HasManyAddAssociationMixin<
    SalesTransaction,
    SalesTransaction["id"]
  >;
  declare getLabeledItems: HasManyGetAssociationsMixin<LabeledItem>;
  declare addLabeledItem: HasManyAddAssociationMixin<
    LabeledItem,
    LabeledItem["id"]
  >;
  declare getArrivals: HasManyGetAssociationsMixin<Arrival>;
  declare addArrival: HasManyAddAssociationMixin<Arrival, Arrival["id"]>;
  declare getManagedStores: HasManyGetAssociationsMixin<Recyclery>;
  declare addManagedStore: HasManyAddAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare addManagedStores: HasManyAddAssociationsMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare setManagedStores: HasManySetAssociationsMixin<
    Recyclery,
    Recyclery["id"]
  >;

  static associate(models: ModelStatics) {
    this.hasMany(models.Donation, { foreignKey: "received_by" });
    this.hasMany(models.SalesTransaction, { foreignKey: "created_by" });
    this.hasMany(models.LabeledItem, { foreignKey: "created_by" });
    this.hasMany(models.Arrival, { foreignKey: "processed_by" });
    this.hasMany(models.Recyclery, {
      foreignKey: "manager_id",
      as: "managedStores",
    });
  }

  static initModel(sequelize: Sequelize) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        username: { type: DataTypes.STRING, unique: true, allowNull: false },
        email: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
          validate: { isEmail: true },
        },
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
        role: {
          type: DataTypes.ENUM(...USER_ROLES),
          defaultValue: "employee",
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING,
          validate: {
            is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/,
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
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
            if (user.password_hash && !user.password_hash.startsWith("$2")) {
              const saltRounds = 10;
              user.password_hash = await bcrypt.hash(
                user.password_hash,
                saltRounds,
              );
            }
          },
          beforeUpdate: async (user) => {
            if (
              user.changed("password_hash") &&
              user.password_hash &&
              !user.password_hash.startsWith("$2")
            ) {
              const saltRounds = 10;
              user.password_hash = await bcrypt.hash(
                user.password_hash,
                saltRounds,
              );
            }
          },
        },
      },
    );
  }
}
