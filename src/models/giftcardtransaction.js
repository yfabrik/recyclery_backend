"use strict";
import { Model } from "sequelize";

/**
 * @param {import("sequelize").Sequelize} sequelize
 * @param {import("sequelize").DataTypes} DataTypes
 */
export default (sequelize, DataTypes) => {
  class GiftCardTransaction extends Model {
    /**
     * @param {import("./types/models.js").models} models
     */
    static associate(models) {
      this.belongsTo(models.GiftCard, { foreignKey: "gift_card_id" });
      this.belongsTo(models.SalesTransaction, {
        foreignKey: "sales_transaction_id",
      });
      this.belongsTo(models.User, {
        as: "createdBy",
        foreignKey: "created_by",
      });
    }
  }

  GiftCardTransaction.init(
    {
      gift_card_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sales_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "issue",
          "charge",
          "refund_recredit",
          "manual_adjustment",
          "expire",
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          /** @param {number|string} value */
          notZero(value) {
            if (Number(value) === 0) {
              throw new Error("amount must be non-zero");
            }
          },
        },
      },
      occurred_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GiftCardTransaction",
      tableName: "giftcard_transactions",
      indexes: [
        { fields: ["gift_card_id", "occurred_at"] },
        { fields: ["sales_transaction_id"] },
      ],
      hooks: {
        beforeCreate: async (movement, options) => {
          /** @type {any} */
          const m = movement;
          const GiftCard = movement.sequelize.models.GiftCard;
          const giftCard = await GiftCard.findByPk(m.gift_card_id, {
            // Critical for refund->new card flow: read inside same SQL transaction.
            transaction: options.transaction,
            include: [
              {
                model: GiftCardTransaction,
                as: "movements",
              },
            ],
          });
          if (!giftCard) { throw new Error("Gift card not found"); }
          /** @type {any} */
          const gc = giftCard;
          let newStatus = gc.status;
          const amount = Math.abs(m.amount);
          const currentValue = gc.current_value;
          if (m.type === "charge") {
            console.log(amount, currentValue)
            if (amount - currentValue < 0) {
              newStatus = "partially_used";
            }
            if (amount - currentValue >= 0) {
              newStatus = "redeemed";
            }

            await giftCard.update({
              status: newStatus,
            }, { transaction: options.transaction });
          }
        },
      },
    });


  return GiftCardTransaction;
};
