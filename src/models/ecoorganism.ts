import {
  DataTypes,
  Model,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type WasteDisposal from "./wasteDisposal.ts";

export default class EcoOrganism extends Model<InferAttributes<EcoOrganism>, InferCreationAttributes<EcoOrganism>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string | null;
  declare contact_email: string | null;
  declare contact_phone: string | null;
  declare address: string | null;
  declare website: string | null;
  declare is_active: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare WasteDisposals?: NonAttribute<WasteDisposal[]>;

  declare getWasteDisposals: HasManyGetAssociationsMixin<WasteDisposal>;
  declare addWasteDisposal: HasManyAddAssociationMixin<WasteDisposal, number>;

  static associate(models: Models) {
    this.hasMany(models.WasteDisposal, { foreignKey: "eco_organism_id" });
  }

  static initModel(sequelize: Sequelize) {
    EcoOrganism.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, unique: true, allowNull: false },
        description: DataTypes.STRING,
        contact_email: { type: DataTypes.STRING, validate: { isEmail: true } },
        contact_phone: {
          type: DataTypes.STRING,
          validate: { is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/ },
        },
        address: DataTypes.STRING,
        website: { type: DataTypes.STRING, validate: { isUrl: true } },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "EcoOrganism",
        indexes: [{ fields: ["is_active"] }],
      },
    );
  }
}
