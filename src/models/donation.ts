import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import type User from "./user.ts";

export default class Donation extends Model<InferAttributes<Donation>, InferCreationAttributes<Donation>> {
  declare id: CreationOptional<number>;
  declare donor_name: string | null;
  declare donor_phone: string | null;
  declare donor_email: string | null;
  declare item_description: string | null;
  declare estimated_value: string | null;
  declare status: "pending" | "accepted" | "rejected";
  declare received_at: Date | null;
  declare donorContact: string | null;
  declare weight: string | null;
  declare recyclery_id: ForeignKey<number | null>;
  declare received_by: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare User?: NonAttribute<User | null>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, number>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, number>;

  static associate(models: Models) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.belongsTo(models.User, { foreignKey: "received_by" });
  }

  static initModel(sequelize: Sequelize) {
    Donation.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        donor_name: {
          type: DataTypes.STRING,
          validate: { isAlphanumeric: true },
        },
        donor_phone: {
          type: DataTypes.STRING,
          validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
        },
        donor_email: { type: DataTypes.STRING, validate: { isEmail: true } },
        item_description: DataTypes.TEXT,
        estimated_value: DataTypes.DECIMAL(10, 2),
        status: {
          type: DataTypes.ENUM("pending", "accepted", "rejected"),
          defaultValue: "pending",
        },
        received_at: DataTypes.DATE,
        donorContact: {
          type: DataTypes.VIRTUAL,
          get(this: Donation) {
            return this.donor_email || this.donor_phone || null;
          },
        },
        weight: {
          type: DataTypes.DECIMAL(10, 2),
          validate: {
            min: 0,
          },
        },
        recyclery_id: DataTypes.INTEGER,
        received_by: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Donation",
        indexes: [{ fields: ["recyclery_id"] }, { fields: ["status"] }, { fields: ["createdAt"] }],
      },
    );
  }
}
