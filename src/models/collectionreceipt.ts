import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export default class CollectionReceipt extends Model<
  InferAttributes<CollectionReceipt>,
  InferCreationAttributes<CollectionReceipt>
> {
  declare id: CreationOptional<number>;
  declare receipt_number: string | null;
  declare items_collected: string | null;
  declare total_weight: string | null;
  declare notes: string | null;
  declare signature_data: string | null;
  declare status: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(_models: Record<string, unknown>) {
    // kept intentionally empty to match current JS behavior
  }

  static initModel(sequelize: Sequelize) {
    CollectionReceipt.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        receipt_number: DataTypes.STRING,
        items_collected: DataTypes.TEXT,
        total_weight: DataTypes.DECIMAL,
        notes: DataTypes.TEXT,
        signature_data: DataTypes.TEXT,
        status: { type: DataTypes.STRING, defaultValue: "draft" },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "CollectionReceipt",
      },
    );
  }
}
