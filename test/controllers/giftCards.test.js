import { expect } from "@jest/globals";
import db from "../../src/models/index";
import {
  chargeGiftCard,
  issueGiftCard,
  recreditGiftCard,
} from "../../src/services/giftCards";
import { invalidateGiftCard } from "../../src/v1/controllers/giftCards";
import { createRecyclery, createUser } from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";

const { CashRegister, CashSession, GiftCard, SalesTransaction } = db;

const createSaleTransaction = async ({ userId }) => {
  const recyclery = await createRecyclery();
  const register = await CashRegister.create({
    name: `Caisse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recyclery_id: recyclery.id,
  });
  const session = await CashSession.create({
    cash_register_id: register.id,
    user_id: userId,
    opening_amount: 0,
  });
  return SalesTransaction.create({
    cash_session_id: session.id,
    created_by: userId,
    payment_method: "cash",
    payment_amount: 10,
    total_amount: 10,
    total_amount_before_promotion: 10,
  });
};

describe("giftCards controller — invalidateGiftCard", () => {
  it("marks a gift card as cancelled", async () => {
    const user = await createUser();
    const tx = await createSaleTransaction({ userId: user.id });
    const card = await issueGiftCard({
      code: `GC-INV-${Date.now()}`,
      initialValue: 40,
      issuedTransactionId: tx.id,
      createdBy: user.id,
    });

    const req = makeReq({
      params: { id: String(card.id) },
      user: { id: user.id, role: "admin" },
    });
    const res = makeRes();

    await invalidateGiftCard(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: card.id,
          status: "cancelled",
        }),
      }),
    );

    await card.reload();
    expect(card.status).toBe("cancelled");
  });

  it("rejects charge and recredit on a cancelled gift card", async () => {
    const user = await createUser();
    const issueTx = await createSaleTransaction({ userId: user.id });
    const usageTx = await createSaleTransaction({ userId: user.id });
    const refundTx = await createSaleTransaction({ userId: user.id });

    const card = await issueGiftCard({
      code: `GC-CANCEL-USE-${Date.now()}`,
      initialValue: 25,
      issuedTransactionId: issueTx.id,
      createdBy: user.id,
    });

    const req = makeReq({
      params: { id: String(card.id) },
      user: { id: user.id, role: "admin" },
    });
    await invalidateGiftCard(req, makeRes());

    await expect(
      chargeGiftCard({
        giftCardId: card.id,
        salesTransactionId: usageTx.id,
        amount: 5,
        createdBy: user.id,
      }),
    ).rejects.toThrow("gift card is cancelled");

    await expect(
      recreditGiftCard({
        giftCardId: card.id,
        salesTransactionId: refundTx.id,
        amount: 5,
        createdBy: user.id,
      }),
    ).rejects.toThrow("gift card is cancelled");

    const persisted = await GiftCard.findByPk(card.id);
    expect(persisted.status).toBe("cancelled");
  });

  it("fails when gift card id does not exist", async () => {
    const req = makeReq({ params: { id: "999999" } });
    const res = makeRes();

    await expect(invalidateGiftCard(req, res)).rejects.toMatchObject({
      status: 404,
    });
  });
});
