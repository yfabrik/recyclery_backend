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
import type { ModelStatics } from "./db-types.ts";
import type LabeledItem from "./labeleditem.ts";
import type Promotion from "./promotion.ts";

export default class Category extends Model<
  InferAttributes<Category>,
  InferCreationAttributes<Category>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare icon: CreationOptional<string | null>;
  declare defaultWeight: CreationOptional<number>;
  declare defaultPrice: CreationOptional<number>;
  declare IO: CreationOptional<number>;
  declare priceBasedOnWeight: CreationOptional<boolean>;
  declare bundleQuantity: CreationOptional<number | null>;
  declare bundlePrice: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare parent_id: ForeignKey<number | null>;

  declare subcategories?: NonAttribute<Category[]>;
  declare parent?: NonAttribute<Category>;
  declare LabeledItems?: NonAttribute<LabeledItem[]>;
  declare Promotions?: NonAttribute<Promotion[]>;

  declare getSubcategories: HasManyGetAssociationsMixin<Category>;
  declare addSubcategory: HasManyAddAssociationMixin<Category, Category["id"]>;
  declare getParent: BelongsToGetAssociationMixin<Category>;
  declare setParent: BelongsToSetAssociationMixin<Category, Category["id"]>;
  declare getLabeledItems: HasManyGetAssociationsMixin<LabeledItem>;
  declare addLabeledItem: HasManyAddAssociationMixin<
    LabeledItem,
    LabeledItem["id"]
  >;
  declare getPromotions: HasManyGetAssociationsMixin<Promotion>;
  declare addPromotion: HasManyAddAssociationMixin<Promotion, Promotion["id"]>;

  static associate(models: ModelStatics) {
    this.hasMany(models.Category, {
      as: "subcategories",
      foreignKey: "parent_id",
      onDelete: "CASCADE",
    });
    this.belongsTo(models.Category, {
      as: "parent",
      foreignKey: "parent_id",
    });
    this.hasMany(models.LabeledItem, {
      foreignKey: "category_id",
      as: "itemsWithCategory",
    });
    this.hasMany(models.LabeledItem, {
      foreignKey: "subcategory_id",
      as: "itemsWithSubCategory",
    });
    this.hasMany(models.Promotion, { foreignKey: "category_id" });
    this.belongsToMany(models.EcoOrganism, {
      through: "ecoOrg_categoryIn",
      as: "inEcoOrganisms",
    });
    this.belongsToMany(models.EcoOrganism, {
      through: "ecoOrg_categorySell",
      as: "sellEcoOrganisms",
    });
    this.hasMany(models.Arrival, {
      foreignKey: "category_id",
      as: "arrivalsWithCategory",
    });
    this.hasMany(models.Arrival, {
      foreignKey: "subcategory_id",
      as: "arrivalsWithSubCategory",
    });
    this.hasMany(models.WasteDisposal, {
      foreignKey: "category_id",
      as: "wastesWithCategory",
    });
    this.hasMany(models.WasteDisposal, {
      foreignKey: "subcategory_id",
      as: "wastesWithSubCategory",
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
        name: { type: DataTypes.STRING, allowNull: false },
        description: DataTypes.TEXT,
        icon: DataTypes.STRING,
        parent_id: DataTypes.INTEGER,
        defaultWeight: {
          type: DataTypes.FLOAT(),
          validate: { min: 0 },
          defaultValue: 0,
          allowNull: false,
        },
        defaultPrice: {
          type: DataTypes.DECIMAL(10, 2),
          validate: { min: 0 },
          defaultValue: 0,
          allowNull: false,
        },
        IO: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        priceBasedOnWeight: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
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
        indexes: [
          { fields: ["parent_id"] },
          { fields: ["parent_id", "name"], unique: true }, //=> enforce unique constraint],
        ],
      },
    );
  }
}
