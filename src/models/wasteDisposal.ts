import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type Category from "./category.ts";
import type EcoOrganism from "./ecoorganism.ts";
import type User from "./user.ts";

export default class WasteDisposal extends Model<
  InferAttributes<WasteDisposal>,
  InferCreationAttributes<WasteDisposal>
> {
  declare id: CreationOptional<number>;
  declare disposal_date: Date;
  declare disposal_type: "eco_organism" | "landfill" | "recycling" | "other";
  declare weight_kg: string;
  declare volume_m3: string | null;
  declare transport_method: string | null;
  declare transport_company: string | null;
  declare transport_cost: string | null;
  declare notes: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare category?: NonAttribute<Category | null>;
  declare subcategory?: NonAttribute<Category | null>;
  declare eco_organism?: NonAttribute<EcoOrganism | null>;
  declare User?: NonAttribute<User | null>;

  declare getCategory: BelongsToGetAssociationMixin<Category>;
  declare setCategory: BelongsToSetAssociationMixin<Category, number>;
  declare getSubcategory: BelongsToGetAssociationMixin<Category>;
  declare setSubcategory: BelongsToSetAssociationMixin<Category, number>;
  declare getEco_organism: BelongsToGetAssociationMixin<EcoOrganism>;
  declare setEco_organism: BelongsToSetAssociationMixin<EcoOrganism, number>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, number>;

  static associate(models: Models) {
    this.belongsTo(models.Category, { as: "category", foreignKey: "category_id" });
    this.belongsTo(models.Category, { as: "subcategory", foreignKey: "subcategory_id" });
    this.belongsTo(models.EcoOrganism, { as: "eco_organism", foreignKey: "eco_organism_id" });
    this.belongsTo(models.User, { foreignKey: "created_by" });
  }

  static initModel(sequelize: Sequelize) {
    WasteDisposal.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        disposal_date: { type: DataTypes.DATE, allowNull: false },
        disposal_type: {
          type: DataTypes.ENUM("eco_organism", "landfill", "recycling", "other"),
          allowNull: false,
        },
        weight_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        volume_m3: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        transport_method: { type: DataTypes.STRING, allowNull: true },
        transport_company: { type: DataTypes.STRING, allowNull: true },
        transport_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "WasteDisposal",
        indexes: [{ fields: ["disposal_date"] }, { fields: ["category_id"] }, { fields: ["eco_organism_id"] }],
      },
    );
  }
}
