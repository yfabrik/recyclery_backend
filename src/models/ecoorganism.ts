import {
  DataTypes,
  Model,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type CreationOptional,
  type HasManyAddAssociationMixin,
  type HasManyGetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";
import type Category from "./category.js";
import type { ModelStatics } from "./db-types.ts";
import type WasteDisposal from "./wasteDisposal.ts";

export default class EcoOrganism extends Model<
  InferAttributes<EcoOrganism>,
  InferCreationAttributes<EcoOrganism>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare contact_email: CreationOptional<string | null>;
  declare contact_phone: CreationOptional<string | null>;
  declare address: CreationOptional<string | null>;
  declare website: CreationOptional<string | null>;
  declare is_active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare WasteDisposals?: NonAttribute<WasteDisposal[]>;
  declare inCategories: NonAttribute<Category[]>;
  declare sellCategories: NonAttribute<Category[]>;

  declare getWasteDisposals: HasManyGetAssociationsMixin<WasteDisposal>;
  declare addWasteDisposal: HasManyAddAssociationMixin<
    WasteDisposal,
    WasteDisposal["id"]
  >;

  declare getInCategories: BelongsToManyGetAssociationsMixin<Category>;
  declare getSellCategories: BelongsToManyGetAssociationsMixin<Category>;
  declare setInCategories: BelongsToManySetAssociationsMixin<
    Category,
    Category["id"]
  >;
  declare setSellCategories: BelongsToManySetAssociationsMixin<
    Category,
    Category["id"]
  >;

  static associate(models: ModelStatics) {
    this.hasMany(models.WasteDisposal, { foreignKey: "eco_organism_id" });
    this.belongsToMany(models.Category, {
      through: "ecoOrg_categoryIn",
      as: "inCategories",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    this.belongsToMany(models.Category, {
      through: "ecoOrg_categorySell",
      as: "sellCategories",
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
        name: { type: DataTypes.STRING, unique: true, allowNull: false },
        description: DataTypes.STRING,
        contact_email: { type: DataTypes.STRING, validate: { isEmail: true } },
        contact_phone: {
          type: DataTypes.STRING,
          validate: {
            is: /^(0|(\+[0-9]{2}[. -]?))[1-9]([. -]?[0-9][0-9]){4}$/,
          },
        },
        address: DataTypes.STRING,
        website: { type: DataTypes.STRING, validate: { isUrl: true } },
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
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
