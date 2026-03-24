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
import { Op } from "sequelize";
import type { Models } from "./db-types.js";
import type Recyclery from "./recyclery.js";
import type Employee from "./employee.js";


async function unsetOtherPrimaries(
  ModelRef: typeof EmployeeStore,
  params: { employeeIds: number[]; excludeId?: number | null },
  options?: { transaction?: import("sequelize").Transaction },
) {
  const { employeeIds, excludeId } = params;
  if (!employeeIds?.length) return;
  const where: Record<string, unknown> = {
    employeeId: { [Op.in]: employeeIds },
    is_primary: true,
  };
  if (excludeId != null) where.id = { [Op.ne]: excludeId };
  const updateOpts: { where: typeof where; transaction?: import("sequelize").Transaction } = { where };
  if (options?.transaction) updateOpts.transaction = options.transaction;
  await ModelRef.update({ is_primary: false }, updateOpts);
}

export default class EmployeeStore extends Model<InferAttributes<EmployeeStore>, InferCreationAttributes<EmployeeStore>> {
  declare id: CreationOptional<number>;
  declare is_primary: boolean;
  declare employeeId: ForeignKey<number | null>;
  declare recycleryId: ForeignKey<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Recyclery?: NonAttribute<Recyclery>;
  declare Employee?: NonAttribute<Employee>;

  declare getRecyclery: BelongsToGetAssociationMixin<Recyclery>;
  declare setRecyclery: BelongsToSetAssociationMixin<Recyclery, number>;

  declare getEmployee: BelongsToGetAssociationMixin<Employee>;
  declare setEmployee: BelongsToSetAssociationMixin<Employee, number>;

  static associate(models: Models) {
    this.belongsTo(models.Recyclery, { foreignKey: "recycleryId" });
    this.belongsTo(models.Employee, { foreignKey: "employeeId" });
  }

  static initModel(sequelize: Sequelize) {
    EmployeeStore.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
        employeeId: DataTypes.INTEGER,
        recycleryId: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "EmployeeStore",
        tableName: "employee_store",
        indexes: [
          { fields: ["employeeId"] },
          { fields: ["recycleryId"] },
          { fields: ["employeeId", "recycleryId"], unique: true },
          {
            unique: true,
            fields: ["employeeId"],
            where: { is_primary: true },
            name: "employee_store_unique_primary_per_employee",
          },
        ],
        hooks: {
          async afterCreate(instance, options) {
            if (!instance.is_primary || instance.employeeId == null) return;
            const opts = options?.transaction ? { transaction: options.transaction } : {};
            await unsetOtherPrimaries(EmployeeStore, { employeeIds: [instance.employeeId], excludeId: instance.id }, opts);
          },
          async beforeBulkCreate(records, options) {
            const withPrimary = records.filter((r) => r.is_primary && r.employeeId != null);
            const employeeIds = [...new Set(withPrimary.map((r) => r.employeeId).filter((id): id is number => id != null))];
            const opts = options?.transaction ? { transaction: options.transaction } : {};
            if (employeeIds.length) {
              await unsetOtherPrimaries(EmployeeStore, { employeeIds, excludeId: null }, opts);
            }
            for (const eid of employeeIds) {
              let first = true;
              for (const r of records) {
                if (r.employeeId !== eid) continue;
                if (!r.is_primary) continue;
                if (!first) (r as { is_primary: boolean }).is_primary = false;
                first = false;
              }
            }
          },
          async beforeUpdate(instance, options) {
            if (!instance.changed("is_primary") || !instance.is_primary || instance.employeeId == null) return;
            const opts = options?.transaction ? { transaction: options.transaction } : {};
            await unsetOtherPrimaries(EmployeeStore, { employeeIds: [instance.employeeId], excludeId: instance.id }, opts);
          },
          async beforeBulkUpdate(options: {
            attributes?: { is_primary?: boolean };
            where?: unknown;
            transaction?: import("sequelize").Transaction | null | undefined;
          }) {
            const attrs = options?.attributes;
            if (!attrs || attrs.is_primary !== true) return;
            const txnOpts = options?.transaction ? { transaction: options.transaction } : {};
            const rows = (await EmployeeStore.findAll({
              where: options.where as import("sequelize").WhereOptions<EmployeeStore>,
              attributes: ["employeeId"],
              raw: true,
              ...txnOpts,
            })) as Array<{ employeeId?: number | null }>;
            const employeeIds = [...new Set(rows.map((r) => r.employeeId).filter((id): id is number => id != null))];
            if (employeeIds.length) {
              await unsetOtherPrimaries(EmployeeStore, { employeeIds, excludeId: null }, txnOpts);
            }
          },
        },
      },
    );
  }
}
