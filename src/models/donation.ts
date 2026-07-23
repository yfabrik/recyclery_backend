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
import type { ModelStatics } from "./db-types.ts";
import type Recyclery from "./recyclery.ts";
import type User from "./user.ts";
import { DONATION_STATUSES, type DonationStatus } from "../constants/dbEnums.js";

export default class Donation extends Model<
  InferAttributes<Donation>,
  InferCreationAttributes<Donation>
> {
  declare id: CreationOptional<number>;
  declare donor_name: CreationOptional<string | null>;
  declare donor_phone: CreationOptional<string | null>;
  declare donor_email: CreationOptional<string | null>;
  declare item_description: CreationOptional<string | null>;
  declare estimated_value: CreationOptional<number | null>;
  declare status: CreationOptional<DonationStatus>;
  declare received_at: CreationOptional<Date>;
  declare donorContact: NonAttribute<string | null>;
  declare weight: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare recyclery_id: ForeignKey<Recyclery["id"] | null>;
  declare received_by: ForeignKey<User["id"]>;

  declare Recyclery?: NonAttribute<Recyclery | null>;
  declare User?: NonAttribute<User>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, User["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Recyclery, { foreignKey: "recyclery_id" });
    this.belongsTo(models.User, {
      foreignKey:{ name:"received_by",allowNull: false},
      onDelete: "RESTRICT",
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
        donor_name: {
          type: DataTypes.STRING,
          validate: { isAlphanumeric: true },
        },
        donor_phone: {
          type: DataTypes.STRING,
          validate: {
            is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/,
          },
        },
        donor_email: { type: DataTypes.STRING, validate: { isEmail: true } },
        item_description: DataTypes.TEXT,
        estimated_value: DataTypes.DECIMAL(10, 2),
        status: {
          type: DataTypes.ENUM(...DONATION_STATUSES),
          defaultValue: "pending",
          allowNull: false,
        },
        received_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          allowNull: false,
        },
        // @ts-expect-error  sequelize virtual marqued as nonattribute
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
          allowNull: false,
        },

        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Donation",
        indexes: [
          { fields: ["recyclery_id"] },
          { fields: ["status"] },
          { fields: ["createdAt"] },
        ],
      },
    );
  }
}
