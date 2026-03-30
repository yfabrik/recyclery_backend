import { Op } from "sequelize";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
import type { Models } from "./db-types.ts";

export default class EmployeeStore extends Model<
  InferAttributes<EmployeeStore>,
  InferCreationAttributes<EmployeeStore>
> {
  declare id: CreationOptional<number>;
  declare is_primary: boolean;
  declare employeeId: CreationOptional<number | null>;
  declare recycleryId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(_models: Models) {}

  static initModel(sequelize: Sequelize) {
    async function unsetOtherPrimaries(
      ModelRef: typeof EmployeeStore,
      {
        employeeIds,
        excludeId,
      }: { employeeIds: number[]; excludeId?: number | null },
      options?: { transaction?: unknown },
    ) {
      if (!employeeIds?.length) return;
      const where: Record<string, unknown> = {
        employeeId: { [Op.in]: employeeIds },
        is_primary: true,
        ...(excludeId != null && { id: { [Op.ne]: excludeId } }),
      };
      await ModelRef.update(
        { is_primary: false },
        {
          where,
          ...(options?.transaction ? { transaction: options.transaction as never } : {}),
        },
      );
    }

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
            const inst = instance as EmployeeStore;
            if (!inst.is_primary || inst.employeeId == null) return;
            const opts = options.transaction ? { transaction: options.transaction } : {};
            await unsetOtherPrimaries(
              EmployeeStore,
              { employeeIds: [inst.employeeId], excludeId: inst.id },
              opts,
            );
          },

          async beforeBulkCreate(records, options) {
            const recs = records as EmployeeStore[];
            const withPrimary = recs.filter((r) => r.is_primary && r.employeeId != null);
            const employeeIds = [...new Set(withPrimary.map((r) => r.employeeId!).filter((id) => id != null))];
            const opts = options.transaction ? { transaction: options.transaction } : {};
            if (employeeIds.length) {
              await unsetOtherPrimaries(EmployeeStore, { employeeIds, excludeId: null }, opts);
            }
            for (const eid of employeeIds) {
              let first = true;
              for (const r of recs) {
                if (r.employeeId !== eid) continue;
                if (!r.is_primary) continue;
                if (!first) r.is_primary = false;
                first = false;
              }
            }
          },

          async beforeUpdate(instance, options) {
            const inst = instance as EmployeeStore;
            if (!inst.changed("is_primary") || !inst.is_primary || inst.employeeId == null) return;
            const opts = options.transaction ? { transaction: options.transaction } : {};
            await unsetOtherPrimaries(EmployeeStore, { employeeIds: [inst.employeeId], excludeId: inst.id }, opts);
          },

          async beforeBulkUpdate(options) {
            const attrs = (options as { attributes?: { is_primary?: boolean } }).attributes;
            if (!attrs || attrs.is_primary !== true) return;
            const txnOpts = (options as { transaction?: unknown }).transaction
              ? { transaction: (options as { transaction: unknown }).transaction }
              : {};
            const whereOpt = (options as { where?: unknown }).where;
            const rows = await EmployeeStore.findAll({
              where: whereOpt,
              attributes: ["employeeId"],
              raw: true,
              ...txnOpts,
            } as never);
            const employeeIds = [
              ...new Set(
                (rows as { employeeId: number | null }[])
                  .map((r) => r.employeeId)
                  .filter((id): id is number => id != null),
              ),
            ];
            if (employeeIds.length) {
              await unsetOtherPrimaries(EmployeeStore, { employeeIds, excludeId: null }, txnOpts);
            }
          },
        },
      },
    );
  }
}
