import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";
import type Category from "./category.ts";
import type Recyclery from "./recyclery.ts";

export default class Promotion extends Model<InferAttributes<Promotion>, InferCreationAttributes<Promotion>> {
  declare id: CreationOptional<number>;
  declare startDate: string;
  declare endDate: string;
  declare isActive: boolean;
  declare promotionValue: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Category?: NonAttribute<Category | null>;
  declare stores?: NonAttribute<Recyclery[]>;

  declare getCategory: BelongsToGetAssociationMixin<Category>;
  declare setCategory: BelongsToSetAssociationMixin<Category, number>;
  declare getStores: BelongsToManyGetAssociationsMixin<Recyclery>;
  declare setStores: BelongsToManySetAssociationsMixin<Recyclery, number>;
  declare addStore: BelongsToManyAddAssociationMixin<Recyclery, number>;

  static associate(models: Models) {
    this.belongsTo(models.Category, { foreignKey: "category_id" });
    this.belongsToMany(models.Recyclery, {
      through: "promotion_store",
      foreignKey: "promotionId",
      otherKey: "storeId",
      as: "stores",
    });
  }

  static initModel(sequelize: Sequelize) {
    Promotion.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        endDate: { type: DataTypes.DATEONLY, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        promotionValue: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          validate: { min: 0, max: 100 },
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Promotion",
        indexes: [{ fields: ["category_id"] }, { fields: ["startDate", "endDate"] }],
      },
    );
  }
}
