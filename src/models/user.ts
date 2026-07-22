import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
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
  type ModelStatic,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type Arrival from "./arrival.ts";
import type { ModelStatics } from "./db-types.ts";
import type Donation from "./donation.ts";
import type GiftCard from "./giftcard.ts";
import type GiftCardTransaction from "./giftcardtransaction.ts";
import type LabeledItem from "./labeleditem.ts";
import type Recyclery from "./recyclery.ts";
import type SalesTransaction from "./salestransaction.ts";
import type WasteDisposal from "./wasteDisposal.ts";
import { USER_ROLES, type UserRole } from "../constants/dbEnums.js";
import type CashSession from "./cashsession.js";export default class User extends Model<
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
  declare CashSessions?: NonAttribute<CashSession[]>;
  declare WasteDisposals?: NonAttribute<WasteDisposal[]>;
  declare createdGiftCards?: NonAttribute<GiftCard[]>;
  declare createdGiftCardTransactions?: NonAttribute<GiftCardTransaction[]>;

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
  declare getCashSessions: HasManyGetAssociationsMixin<CashSession>;
  declare getWasteDisposals: HasManyGetAssociationsMixin<WasteDisposal>;
  declare getCreatedGiftCards: HasManyGetAssociationsMixin<GiftCard>;
  declare getCreatedGiftCardTransactions: HasManyGetAssociationsMixin<GiftCardTransaction>;

  static associate(models: ModelStatics) {
    this.hasMany(models.Donation, {
      foreignKey: "received_by",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.SalesTransaction, {
      foreignKey: "created_by",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.LabeledItem, {
      foreignKey: "created_by",
      as: "LabeledItems",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.Arrival, {
      foreignKey: "processed_by",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.Recyclery, {
      foreignKey: "manager_id",
      as: "managedStores",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.CashSession, {
      foreignKey: "user_id",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.WasteDisposal, {
      foreignKey: "created_by",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.GiftCard, {
      foreignKey: "created_by",
      as: "createdGiftCards",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    this.hasMany(models.GiftCardTransaction, {
      foreignKey: "created_by",
      as: "createdGiftCardTransactions",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
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
          beforeDestroy: async (user) => {
            const s = user.sequelize.models;
            const counts = await Promise.all([
              (s.Donation as ModelStatic<Donation>).count({
                where: { received_by: user.id },
              }),
              (s.Arrival as ModelStatic<Arrival>).count({
                where: { processed_by: user.id },
              }),
              (s.CashSession as ModelStatic<CashSession>).count({
                where: { user_id: user.id },
              }),
              (s.WasteDisposal as ModelStatic<WasteDisposal>).count({
                where: { created_by: user.id },
              }),
            ]);
            if (counts.some((n) => n > 0)) {
              throw new createHttpError[424](
                "Impossible de supprimer un utilisateur encore référencé par des données métier",
              );
            }
          },
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
