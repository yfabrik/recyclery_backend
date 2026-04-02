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
import type CollectionPoint from "./collectionpoint.ts";
import type User from "./user.ts";

export default class Arrival extends Model<
  InferAttributes<Arrival>,
  InferCreationAttributes<Arrival>
> {
  declare id: CreationOptional<number>;
  declare weight: string;
  declare arrival_date: Date;
  declare arrival_time: string | null;
  declare source_type: "point" | "apport" | "house_clearance" | null;
  declare source_details: string | null;
  declare notes: string | null;
  declare status: "received";
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare categorie?: NonAttribute<Category>;
  declare subcategorie?: NonAttribute<Category>;
  declare CollectionPoint?: NonAttribute<CollectionPoint>;
  declare User?: NonAttribute<User>;

  declare getCategorie: BelongsToGetAssociationMixin<Category>;
  declare setCategorie: BelongsToSetAssociationMixin<Category, number>;
  declare getSubcategorie: BelongsToGetAssociationMixin<Category>;
  declare setSubcategorie: BelongsToSetAssociationMixin<Category, number>;
  declare getCollectionPoint: BelongsToGetAssociationMixin<CollectionPoint>;
  declare setCollectionPoint: BelongsToSetAssociationMixin<
    CollectionPoint,
    number
  >;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, number>;

  static associate(models: Models) {
    this.belongsTo(models.Category, {
      foreignKey: "category_id",
      as: "categorie",
    });
    this.belongsTo(models.Category, {
      foreignKey: "subcategory_id",
      as: "subcategorie",
    });
    this.belongsTo(models.CollectionPoint, {
      foreignKey: "collection_point_id",
    });
    this.belongsTo(models.User, { foreignKey: "processed_by" });
  }

  static initModel(sequelize: Sequelize) {
    Arrival.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        weight: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        arrival_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        arrival_time: DataTypes.TIME,
        source_type: {
          type: DataTypes.ENUM("point", "apport", "house_clearance"),
        },
        source_details: DataTypes.TEXT,
        notes: DataTypes.TEXT,
        status: { type: DataTypes.ENUM("received"), defaultValue: "received" },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "Arrival",
        indexes: [
          { fields: ["category_id"] },
          { fields: ["status"] },
          { fields: ["createdAt"] },
        ],
      },
    );
  }
}
