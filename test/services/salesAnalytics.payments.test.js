import { describe, expect, it } from "@jest/globals";
import { amountsByMethod } from "../../src/services/salesAnalytics/index";

describe("amountsByMethod", () => {
  it("keeps the cash the till kept: total − non-cash payments, whatever was handed over", () => {
    // 30 € paid with a 10 € check and two cash lines of 20 € and 5 € (15 € change).
    expect(
      amountsByMethod({
        amount: 30,
        paymentMethod: "mixed",
        payments: [
          { method: "check", amount: 10 },
          { method: "cash", amount: 20 },
          { method: "cash", amount: 5 },
        ],
      }),
    ).toEqual([
      { method: "check", amount: 10, count: 1 },
      { method: "cash", amount: 20, count: 2 },
    ]);
  });

  it("reads a transaction with no payment rows as one payment of its payment_method", () => {
    expect(amountsByMethod({ amount: 18.5, paymentMethod: "cash", payments: [] })).toEqual([
      { method: "cash", amount: 18.5, count: 1 },
    ]);
    expect(amountsByMethod({ amount: 7, paymentMethod: "giftcard", payments: [] })).toEqual([
      { method: "giftcard", amount: 7, count: 1 },
    ]);
  });
});
