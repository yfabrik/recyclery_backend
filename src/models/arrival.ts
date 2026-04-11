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
import type CollectionPoint from "./collectionpoint.ts";
import type { ModelStatics } from "./db-types.ts";
import type User from "./user.ts";

export default class Arrival extends Model<
  InferAttributes<Arrival>,
  InferCreationAttributes<Arrival>
> {
  declare id: CreationOptional<number>;
  declare weight: number;
  declare arrival_date: Date;
  declare arrival_time: string | null;
  declare source_type: "point" | "apport" | "house_clearance";
  declare source_details: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare status: CreationOptional<"received">;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare processed_by: ForeignKey<User["id"]>;
  declare category_id: ForeignKey<Category["id"]>;
  declare subcategory_id: ForeignKey<Category["id"] | null>;
  declare collection_point_id: ForeignKey<CollectionPoint["id"] | null>;

  declare categorie?: NonAttribute<Category>;
  declare subcategorie?: NonAttribute<Category>;
  declare CollectionPoint?: NonAttribute<CollectionPoint>;
  declare User?: NonAttribute<User>;

  declare getCategorie: BelongsToGetAssociationMixin<Category>;
  declare setCategorie: BelongsToSetAssociationMixin<Category, Category["id"]>;
  declare getSubcategorie: BelongsToGetAssociationMixin<Category>;
  declare setSubcategorie: BelongsToSetAssociationMixin<
    Category,
    Category["id"]
  >;
  declare getCollectionPoint: BelongsToGetAssociationMixin<CollectionPoint>;
  declare setCollectionPoint: BelongsToSetAssociationMixin<
    CollectionPoint,
    CollectionPoint["id"]
  >;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare setUser: BelongsToSetAssociationMixin<User, User["id"]>;

  static associate(models: ModelStatics) {
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
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        weight: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        arrival_date: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          allowNull: false,
        },
        arrival_time: DataTypes.TIME,
        source_type: {
          type: DataTypes.ENUM("point", "apport", "house_clearance"),
          allowNull: false,
        },
        source_details: DataTypes.TEXT,
        notes: DataTypes.TEXT,
        status: {
          type: DataTypes.ENUM("received"),
          defaultValue: "received",
          allowNull: false,
        },
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
