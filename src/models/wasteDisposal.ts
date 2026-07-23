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
import type Category from "./category.ts";
import type { ModelStatics } from "./db-types.ts";
import type EcoOrganism from "./ecoorganism.ts";
import type User from "./user.ts";
import {
  WASTE_DISPOSAL_TYPES,
  type WasteDisposalType,
} from "../constants/dbEnums.js";

export default class WasteDisposal extends Model<
  InferAttributes<WasteDisposal>,
  InferCreationAttributes<WasteDisposal>
> {
  declare id: CreationOptional<number>;
  declare disposal_date: CreationOptional<Date>;
  declare disposal_type: WasteDisposalType;
  declare weight_kg: number;
  declare volume_m3: CreationOptional<number | null>;
  declare transport_method: CreationOptional<string | null>;
  declare transport_company: CreationOptional<string | null>;
  declare transport_cost: CreationOptional<number | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare category_id: ForeignKey<Category["id"]>;
  declare subcategory_id: ForeignKey<Category["id"] | null>;
  declare eco_organism_id: ForeignKey<EcoOrganism["id"] | null>;
  declare created_by: ForeignKey<User["id"]>;

  declare category?: NonAttribute<Category>;
  declare subcategory?: NonAttribute<Category | null>;
  declare eco_organism?: NonAttribute<EcoOrganism | null>;
  declare User?: NonAttribute<User>;

  declare getCategory: BelongsToGetAssociationMixin<Category>;
  declare setCategory: BelongsToSetAssociationMixin<Category, Category["id"]>;
  declare getSubcategory: BelongsToGetAssociationMixin<Category>;
  declare setSubcategory: BelongsToSetAssociationMixin<
    Category,
    Category["id"]
  >;
  declare getEco_organism: BelongsToGetAssociationMixin<EcoOrganism>;
  declare setEco_organism: BelongsToSetAssociationMixin<
    EcoOrganism,
    EcoOrganism["id"]
  >;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, User["id"]>;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Category, {
      as: "category",
      foreignKey: { name: "category_id", allowNull: false },
    });
    this.belongsTo(models.Category, {
      as: "subcategory",
      foreignKey: { name: "subcategory_id", allowNull: true },
    });
    this.belongsTo(models.EcoOrganism, {
      as: "eco_organism",
      foreignKey: { name: "eco_organism_id", allowNull: true },
    });
    this.belongsTo(models.User, {
      foreignKey: { name: "created_by", allowNull: false },
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
        disposal_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        disposal_type: {
          type: DataTypes.ENUM(...WASTE_DISPOSAL_TYPES),
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
        indexes: [
          { fields: ["disposal_date"] },
          { fields: ["category_id"] },
          { fields: ["eco_organism_id"] },
        ],
      },
    );
  }
}
