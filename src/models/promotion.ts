import {
  DataTypes,
  Model,
  type BelongsToGetAssociationMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
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
import type Recyclery from "./recyclery.ts";

export default class Promotion extends Model<
  InferAttributes<Promotion>,
  InferCreationAttributes<Promotion>
> {
  declare id: CreationOptional<number>;
  declare startDate: string;
  declare endDate: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare promotionValue: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare category_id: ForeignKey<Category["id"]>;

  declare Category?: NonAttribute<Category>;
  declare stores?: NonAttribute<Recyclery[]>;

  declare getCategory: BelongsToGetAssociationMixin<Category>;
  declare setCategory: BelongsToSetAssociationMixin<Category, Category["id"]>;
  declare getStores: BelongsToManyGetAssociationsMixin<Recyclery>;
  declare setStores: BelongsToManySetAssociationsMixin<
    Recyclery,
    Recyclery["id"]
  >;
  declare addStore: BelongsToManyAddAssociationMixin<
    Recyclery,
    Recyclery["id"]
  >;

  static associate(models: ModelStatics) {
    this.belongsTo(models.Category, { foreignKey: {name:"category_id",allowNull: false} });
    this.belongsToMany(models.Recyclery, {
      through: "promotion_store",
      foreignKey: "promotionId",
      otherKey: "storeId",
      as: "stores",
      onDelete: "CASCADE",
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
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        endDate: { type: DataTypes.DATEONLY, allowNull: true },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
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
        indexes: [
          { fields: ["category_id"] },
          { fields: ["startDate", "endDate"] },
        ],
      },
    );
  }
}
