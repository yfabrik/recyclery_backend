import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type LabeledItem from "./labeleditem.ts";
import type Promotion from "./promotion.ts";

export default class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string | null;
  declare icon: string | null;
  declare defaultWeight: number;
  declare defaultPrice: string | null;
  declare IO: number;
  declare priceBasedOnWeight: boolean;
  declare bundleQuantity: number | null;
  declare bundlePrice: string | null;
  declare parent_id: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare subcategories?: NonAttribute<Category[]>;
  declare parent?: NonAttribute<Category>;
  declare LabeledItems?: NonAttribute<LabeledItem[]>;
  declare Promotions?: NonAttribute<Promotion[]>;

  declare getSubcategories: HasManyGetAssociationsMixin<Category>;
  declare addSubcategory: HasManyAddAssociationMixin<Category, number>;
  declare getParent: BelongsToGetAssociationMixin<Category>;
  declare setParent: BelongsToSetAssociationMixin<Category, number>;
  declare getLabeledItems: HasManyGetAssociationsMixin<LabeledItem>;
  declare addLabeledItem: HasManyAddAssociationMixin<LabeledItem, number>;
  declare getPromotions: HasManyGetAssociationsMixin<Promotion>;
  declare addPromotion: HasManyAddAssociationMixin<Promotion, number>;

  static associate(models: Models) {
    this.hasMany(models.Category, {
      as: "subcategories",
      foreignKey: "parent_id",
      onDelete: "CASCADE",
    });
    this.belongsTo(models.Category, {
      as: "parent",
      foreignKey: "parent_id",
    });
    this.hasMany(models.LabeledItem, { foreignKey: "category_id" });
    this.hasMany(models.Promotion, { foreignKey: "category_id" });
    this.belongsToMany(models.EcoOrganism, {
      through: "ecoOrg_categoryIn",
      as: "inEcoOrganisms",
    });
    this.belongsToMany(models.EcoOrganism, {
      through: "ecoOrg_categorySell",
      as: "sellEcoOrganisms",
    });
  }

  static initModel(sequelize: Sequelize) {
    Category.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: { type: DataTypes.STRING, allowNull: false },
        description: DataTypes.TEXT,
        icon: DataTypes.STRING,
        parent_id: DataTypes.INTEGER,
        defaultWeight: {
          type: DataTypes.FLOAT(),
          validate: { min: 0 },
          defaultValue: 0,
        },
        defaultPrice: {
          type: DataTypes.DECIMAL(10, 2),
          validate: { min: 0 },
          defaultValue: 0,
        },
        IO: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        priceBasedOnWeight: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        bundleQuantity: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        bundlePrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Category",
        indexes: [{ fields: ["parent_id"] }],
      },
    );
  }
}
