import {
  DataTypes,
  Model,
  Op,
  Transaction,
  type Attributes,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
  type WhereOptions,
} from "sequelize";
import { withTransaction } from "../utils/transaction.js";
import type { Models } from "./db-types.ts";
import type Employee from "./employee.js";
import type Recyclery from "./recyclery.js";

export default class EmployeeStore extends Model<
  InferAttributes<EmployeeStore>,
  InferCreationAttributes<EmployeeStore>
> {
  declare is_primary: boolean;
  declare employeeId: ForeignKey<Employee["id"]>;
  declare recycleryId: ForeignKey<Recyclery["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate(_models: Models) {}

  static initModel(sequelize: Sequelize) {
    async function unsetOtherPrimaries(
      ModelRef: typeof EmployeeStore,
      {
        employeeIds,
        excludeId,
      }: { employeeIds: Employee["id"][]; excludeId?: Recyclery["id"] | null },
      options?: { transaction?: Transaction },
    ) {
      if (!employeeIds?.length) return;
      const where: WhereOptions<Attributes<EmployeeStore>> = {
        employeeId: { [Op.in]: employeeIds },
        is_primary: true,
        ...(excludeId != null && { recycleryId: { [Op.ne]: excludeId } }),
      };
      await ModelRef.update(
        { is_primary: false },
        {
          where,
          ...(options?.transaction ? { transaction: options.transaction } : {}),
        },
      );
    }

    return this.init(
      {
        is_primary: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        employeeId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
        recycleryId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true,
        },
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
          { fields: ["employeeId", "recycleryId"], unique: true }, //already set by PK
          ...(sequelize.getDialect() === "sqlite"
            ? [
                {
                  unique: true,
                  fields: ["employeeId"],
                  where: { is_primary: true },
                  name: "employee_store_unique_primary_per_employee",
                },
              ]
            : []),
        ],
        hooks: {
          async afterCreate(instance, options) {
            if (!instance.is_primary) return;
            await withTransaction(
              sequelize,
              options.transaction,
              async (transaction) => {
                await unsetOtherPrimaries(
                  EmployeeStore,
                  {
                    employeeIds: [instance.employeeId],
                    excludeId: instance.recycleryId,
                  }, //TODO revoir
                  { transaction },
                );
              },
            );
          },

          async beforeBulkCreate(records, options) {
            const withPrimary = records.filter(
              (r) => r.is_primary && r.employeeId != null,
            );
            const employeeIds = [
              ...new Set(withPrimary.map((r) => r.employeeId)),
            ];
            if (employeeIds.length) {
              await withTransaction(
                sequelize,
                options.transaction,
                async (transaction) => {
                  await unsetOtherPrimaries(
                    EmployeeStore,
                    { employeeIds, excludeId: null },
                    { transaction },
                  );
                },
              );
            }
            //USELESS ?
            for (const eid of employeeIds) {
              let first = true;
              for (const r of records) {
                if (r.employeeId !== eid) continue;
                if (!r.is_primary) continue;
                if (!first) r.is_primary = false;
                first = false;
              }
            }
          },

          async beforeUpdate(instance, options) {
            if (
              !instance.changed("is_primary") ||
              !instance.is_primary ||
              instance.employeeId == null
            )
              return;
            await withTransaction(
              sequelize,
              options.transaction,
              async (transaction) => {
                await unsetOtherPrimaries(
                  EmployeeStore,
                  {
                    employeeIds: [instance.employeeId],
                    excludeId: instance.recycleryId,
                  },
                  { transaction },
                );
              },
            );
          },

          //FAUX
          async beforeBulkUpdate(options) {
            const attrs = (options as { attributes?: { is_primary?: boolean } })
              .attributes;
            if (!attrs || attrs.is_primary !== true) return;
            await withTransaction(
              sequelize,
              options.transaction,
              async (transaction) => {
                const whereOpt: WhereOptions<EmployeeStore> = {};
                const rows = await EmployeeStore.findAll({
                  where: whereOpt,
                  attributes: ["employeeId"],
                  raw: true,
                  transaction,
                });
                const employeeIds = [
                  ...new Set(
                    rows
                      .map((r) => r.employeeId)
                      .filter((id): id is number => id != null),
                  ),
                ];
                if (employeeIds.length) {
                  await unsetOtherPrimaries(
                    EmployeeStore,
                    { employeeIds, excludeId: null },
                    { transaction },
                  );
                }
              },
            );
          },
        },
      },
    );
  }
}
