import db from "../../src/models/index";
import {
  chargeGiftCard,
  getGiftCardBalance,
  issueGiftCard,
  recreditGiftCard,
} from "../../src/services/giftCards";
import { createRecyclery, createUser } from "../models/helpers.js";

const { CashRegister, CashSession, SalesTransaction } = db;

const createSaleTransaction = async ({ userId }) => {
  const recyclery = await createRecyclery();
  const register = await CashRegister.create({
    name: `Caisse_${Date.now()}`,
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
  });
};

describe("giftCards service", () => {
  it("issues a gift card and creates initial balance", async () => {
    const user = await createUser();
    const tx = await createSaleTransaction({ userId: user.id });

    const card = await issueGiftCard({
      code: `GC-ISSUE-${Date.now()}`,
      initialValue: 50,
      issuedTransactionId: tx.id,
      createdBy: user.id,
    });

    const balance = await getGiftCardBalance(card.id);
    expect(balance.giftCard.id).toBe(card.id);
    expect(balance.currentBalance).toBe(100);
  });

  it("charges and recredits gift card correctly", async () => {
    const user = await createUser();
    const issueTx = await createSaleTransaction({ userId: user.id });
    const usageTx = await createSaleTransaction({ userId: user.id });
    const refundTx = await createSaleTransaction({ userId: user.id });

    const card = await issueGiftCard({
      code: `GC-FLOW-${Date.now()}`,
      initialValue: 30,
      issuedTransactionId: issueTx.id,
      createdBy: user.id,
    });

    await chargeGiftCard({
      giftCardId: card.id,
      salesTransactionId: usageTx.id,
      amount: 12,
      createdBy: user.id,
    });

    let balance = await getGiftCardBalance(card.id);
    expect(balance.currentBalance).toBe(48);

    await recreditGiftCard({
      giftCardId: card.id,
      salesTransactionId: refundTx.id,
      amount: 7,
      createdBy: user.id,
    });

    balance = await getGiftCardBalance(card.id);
    expect(balance.currentBalance).toBe(55);
  });

  it("rejects charge when balance is insufficient", async () => {
    const user = await createUser();
    const issueTx = await createSaleTransaction({ userId: user.id });
    const usageTx = await createSaleTransaction({ userId: user.id });

    const card = await issueGiftCard({
      code: `GC-LOW-${Date.now()}`,
      initialValue: 5,
      issuedTransactionId: issueTx.id,
      createdBy: user.id,
    });

    await expect(
      chargeGiftCard({
        giftCardId: card.id,
        salesTransactionId: usageTx.id,
        amount: 20,
        createdBy: user.id,
      }),
    ).rejects.toThrow("insufficient gift card balance");
  });

  it("rejects charge on expired card", async () => {
    const user = await createUser();
    const issueTx = await createSaleTransaction({ userId: user.id });
    const usageTx = await createSaleTransaction({ userId: user.id });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const card = await issueGiftCard({
      code: `GC-EXP-${Date.now()}`,
      initialValue: 10,
      issuedTransactionId: issueTx.id,
      createdBy: user.id,
      expiresAt: yesterday,
    });

    await expect(
      chargeGiftCard({
        giftCardId: card.id,
        salesTransactionId: usageTx.id,
        amount: 1,
        createdBy: user.id,
      }),
    ).rejects.toThrow("gift card is expired");
  });
});
