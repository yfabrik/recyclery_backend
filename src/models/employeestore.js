"use strict";
import { Model } from "sequelize";
import { Op } from "sequelize";

/** @typedef {import("./types/employeestoreModel.js").EmployeeStoreInstance} EmployeeStoreInstance */
/** @typedef {import("./types/employeestoreModel.js").EmployeeStoreCreateAttributes} EmployeeStoreCreateAttributes */
/** @typedef {import("./types/employeestoreModel.js").EmployeeStoreBulkUpdateOptionsLike} EmployeeStoreBulkUpdateOptionsLike */

/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class EmployeeStore extends Model {
    /**
     *@param {import ('./types/models.js').models} models
     */
    static associate(models) {
      // this.belongsTo(models.Recyclery, { foreignKey: "store_id" });
      // this.belongsTo(models.Employee, { foreignKey: "employee_id" });
    }
  }

  /**
   * Set is_primary to false for all EmployeeStore rows of the given employee(s),
   * optionally excluding specific id(s). Uses options.transaction when provided.
   * @param {import("sequelize").ModelStatic<EmployeeStore>} ModelRef
   * @param {{ employeeIds: number[], excludeId?: number | null }} params
   * @param {{ transaction?: import("sequelize").Transaction }} [options]
   */
  async function unsetOtherPrimaries(ModelRef, { employeeIds, excludeId }, options) {
    if (!employeeIds?.length) return;
    const where = {
      employeeId: { [Op.in]: employeeIds },
      is_primary: true,
      ...(excludeId != null && { id: { [Op.ne]: excludeId } }),
    };
    const updateOpts = { where, ...(options?.transaction ? { transaction: options.transaction } : {}) };
    await ModelRef.update({ is_primary: false }, updateOpts);
  }

  // TABLE JOIN TABLE (employeeId, recycleryId from belongsToMany through)
  EmployeeStore.init(
    {
      is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
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
          const inst = /** @type {EmployeeStoreInstance} */ (/** @type {unknown} */ (instance));
          if (!inst.is_primary || inst.employeeId == null) return;
          const opts = options?.transaction ? { transaction: options.transaction } : {};
          await unsetOtherPrimaries(
            EmployeeStore,
            { employeeIds: [inst.employeeId], excludeId: inst.id },
            opts
          );
        },

        async beforeBulkCreate(records, options) {
          const recs = /** @type {EmployeeStoreCreateAttributes[]} */ (/** @type {unknown} */ (records));
          const withPrimary = recs.filter((r) => r.is_primary && r.employeeId != null);
          const employeeIds = /** @type {number[]} */ ([...new Set(withPrimary.map((r) => r.employeeId).filter((id) => id != null))]);
          const opts = options?.transaction ? { transaction: options.transaction } : {};
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
          const inst = /** @type {EmployeeStoreInstance} */ (/** @type {unknown} */ (instance));
          if (!inst.changed("is_primary") || !inst.is_primary || inst.employeeId == null) return;
          const opts = options?.transaction ? { transaction: options.transaction } : {};
          await unsetOtherPrimaries(
            EmployeeStore,
            { employeeIds: [inst.employeeId], excludeId: inst.id },
            opts
          );
        },

        async beforeBulkUpdate(options) {
          const opts = /** @type {EmployeeStoreBulkUpdateOptionsLike} */ (options);
          const attrs = opts?.attributes;
          if (!attrs || attrs.is_primary !== true) return;
          const txnOpts = opts?.transaction ? { transaction: opts.transaction } : {};
          const rows = await EmployeeStore.findAll({
            where: opts.where,
            attributes: ["employeeId"],
            raw: true,
            ...txnOpts,
          });
          const employeeIds = /** @type {number[]} */ ([...new Set(rows.map((r) => /** @type {EmployeeStoreCreateAttributes} */ (/** @type {unknown} */ (r)).employeeId).filter((id) => id != null))]);
          if (employeeIds.length) {
            await unsetOtherPrimaries(EmployeeStore, { employeeIds, excludeId: null }, txnOpts);
          }
        },
      },
    }
  );
  return EmployeeStore;
};
