import db from "../../src/models/index";
import {
  chargeGiftCard,
  issueGiftCard,
  isGiftCardUsed,
} from "../../src/services/giftCards";
import {
  createCategory,
  createCollectionPoint,
  createRecyclery,
  createUser,
} from "./helpers.js";

const {
  Arrival,
  CashRegister,
  CashSession,
  Category,
  GiftCard,
  GiftCardTransaction,
  LabeledItem,
  SalesTransaction,
  TransactionItem,
  TransactionPayment,
  WasteDisposal,
} = db;

const createOpenSessionSale = async (userId) => {
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
  const sale = await SalesTransaction.create({
    cash_session_id: session.id,
    created_by: userId,
    payment_method: "cash",
    payment_amount: 10,
    total_amount: 10,
    total_amount_before_promotion: 10,
  });
  return { recyclery, register, session, sale };
};

describe("delete guards", () => {
  describe("User RESTRICT vs managedStores SET NULL", () => {
    it("allows delete when only manager_id links exist and clears manager", async () => {
      const user = await createUser();
      const store = await createRecyclery({ manager_id: user.id });
      await user.destroy();
      await store.reload();
      expect(store.manager_id).toBeNull();
      expect(await db.User.findByPk(user.id)).toBeNull();
    });

    it("allows delete when user created a sale and clears created_by", async () => {
      const creator = await createUser();
      const cashier = await createUser();
      const { sale } = await createOpenSessionSale(cashier.id);
      await sale.update({ created_by: creator.id });
      await creator.destroy();
      await sale.reload();
      expect(sale.created_by).toBeNull();
      expect(await db.User.findByPk(creator.id)).toBeNull();
    });

    it("allows delete when user created a labeled item and clears created_by", async () => {
      const user = await createUser();
      const recyclery = await createRecyclery();
      const cat = await createCategory();
      const item = await LabeledItem.create({
        category_id: cat.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 1,
      });
      await user.destroy();
      await item.reload();
      expect(item.created_by).toBeNull();
      expect(await db.User.findByPk(user.id)).toBeNull();
    });

    it("allows delete when user created a gift card and clears created_by", async () => {
      const creator = await createUser();
      const cashier = await createUser();
      const { sale } = await createOpenSessionSale(cashier.id);
      const card = await issueGiftCard({
        code: `GC-USERDEL-${Date.now()}`,
        initialValue: 20,
        // issuedTransactionId: sale.id,
        createdBy: creator.id,
      });
      await creator.destroy();
      await card.reload();
      expect(card.created_by).toBeNull();
      const movements = await GiftCardTransaction.findAll({
        where: { gift_card_id: card.id },
      });
      // expect(movements.length).toBeGreaterThan(0);
      // expect(movements.every((m) => m.created_by === null)).toBe(true);
      expect(await db.User.findByPk(creator.id)).toBeNull();
    });

    it("blocks delete when user created a waste disposal", async () => {
      const user = await createUser();
      const cat = await createCategory();
      await WasteDisposal.create({
        category_id: cat.id,
        disposal_date: new Date(),
        disposal_type: "recycling",
        weight_kg: 1,
        created_by: user.id,
      });
      await expect(user.destroy()).rejects.toMatchObject({ status: 424 });
      expect(await db.User.findByPk(user.id)).not.toBeNull();
    });
  });

  describe("Category", () => {
    it("allows delete when unused", async () => {
      const cat = await createCategory();
      await cat.destroy();
      expect(await Category.findByPk(cat.id)).toBeNull();
    });

    it.each([
      [
        "labeled item",
        async (cat, user) => {
          const recyclery = await createRecyclery();
          await LabeledItem.create({
            category_id: cat.id,
            recyclery_id: recyclery.id,
            created_by: user.id,
            price: 1,
          });
        },
      ],
      [
        "arrival",
        async (cat, user) => {
          await Arrival.create({
            category_id: cat.id,
            weight: 1,
            arrival_date: new Date(),
            source_type: "apport",
            processed_by: user.id,
            status: "received",
          });
        },
      ],
      [
        "waste",
        async (cat, user) => {
          await WasteDisposal.create({
            category_id: cat.id,
            disposal_date: new Date(),
            disposal_type: "recycling",
            weight_kg: 1,
            created_by: user.id,
          });
        },
      ],
    ])("blocks delete when used by %s", async (_label, seed) => {
      const cat = await createCategory();
      const user = await createUser();
      await seed(cat, user);
      await expect(cat.destroy()).rejects.toMatchObject({ status: 424 });
      expect(await Category.findByPk(cat.id)).not.toBeNull();
    });
  });

  describe("CollectionPoint", () => {
    it("allows delete without arrivals", async () => {
      const recyclery = await createRecyclery();
      const point = await createCollectionPoint(recyclery.id);
      await point.destroy();
      expect(await db.CollectionPoint.findByPk(point.id)).toBeNull();
    });

    it("blocks delete with arrivals", async () => {
      const recyclery = await createRecyclery();
      const point = await createCollectionPoint(recyclery.id);
      const cat = await createCategory();
      const user = await createUser();
      await Arrival.create({
        category_id: cat.id,
        collection_point_id: point.id,
        weight: 1,
        arrival_date: new Date(),
        source_type: "point",
        processed_by: user.id,
        status: "received",
      });
      await expect(point.destroy()).rejects.toMatchObject({ status: 424 });
    });
  });

  describe("Recyclery", () => {
    it("blocks delete when open cash session", async () => {
      const user = await createUser();
      const { recyclery } = await createOpenSessionSale(user.id);
      await expect(recyclery.destroy()).rejects.toMatchObject({ status: 424 });
    });

    it("blocks delete when sales exist via register/session", async () => {
      const user = await createUser();
      const { recyclery, session } = await createOpenSessionSale(user.id);
      await session.update({ status: "close", closing_amount: 0, closed_at: new Date() });
      await expect(recyclery.destroy()).rejects.toMatchObject({ status: 424 });
    });

    it("allows delete of empty store", async () => {
      const recyclery = await createRecyclery();
      await recyclery.destroy();
      expect(await db.Recyclery.findByPk(recyclery.id)).toBeNull();
    });
  });

  describe("LabeledItem", () => {
    it("allows delete when available and unsold", async () => {
      const cat = await createCategory();
      const recyclery = await createRecyclery();
      const user = await createUser();
      const item = await LabeledItem.create({
        category_id: cat.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 5,
        status: "available",
      });
      await item.destroy();
      expect(await LabeledItem.findByPk(item.id)).toBeNull();
    });

    it("blocks delete when sold", async () => {
      const cat = await createCategory();
      const recyclery = await createRecyclery();
      const user = await createUser();
      const item = await LabeledItem.create({
        category_id: cat.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 5,
        status: "sold",
      });
      await expect(item.destroy()).rejects.toMatchObject({ status: 424 });
    });

    it("blocks delete when linked to a sale line", async () => {
      const cat = await createCategory();
      const user = await createUser();
      const { sale } = await createOpenSessionSale(user.id);
      const item = await LabeledItem.create({
        category_id: cat.id,
        recyclery_id: (await createRecyclery()).id,
        created_by: user.id,
        price: 5,
        status: "available",
      });
      await TransactionItem.create({
        transaction_id: sale.id,
        labeled_item_id: item.id,
        name: "Article",
        price: 5,
        quantity: 1,
      });
      await expect(item.destroy()).rejects.toMatchObject({ status: 424 });
      expect(
        await TransactionItem.count({ where: { labeled_item_id: item.id } }),
      ).toBe(1);
    });
  });

  describe("GiftCard + SalesTransaction", () => {
    it("blocks direct gift card destroy even when unused", async () => {
      const user = await createUser();
      const { sale } = await createOpenSessionSale(user.id);
      const card = await issueGiftCard({
        code: `GC-DIRECT-${Date.now()}`,
        initialValue: 20,
        issuedTransactionId: sale.id,
        createdBy: user.id,
      });
      await expect(card.destroy()).rejects.toMatchObject({ status: 424 });
      expect(await GiftCard.findByPk(card.id)).not.toBeNull();
    });

    it("deletes unused issued card when sale is destroyed", async () => {
      const user = await createUser();
      const { sale } = await createOpenSessionSale(user.id);
      const card = await issueGiftCard({
        code: `GC-UNUSED-${Date.now()}`,
        initialValue: 20,
        issuedTransactionId: sale.id,
        createdBy: user.id,
      });
      expect(await isGiftCardUsed(card.id)).toBe(false);
      await sale.destroy();
      expect(await GiftCard.findByPk(card.id)).toBeNull();
      expect(
        await GiftCardTransaction.count({ where: { gift_card_id: card.id } }),
      ).toBe(0);
      expect(await SalesTransaction.findByPk(sale.id)).toBeNull();
    });

    it("refuses sale delete when issued card was charged", async () => {
      const user = await createUser();
      const { sale: issueSale } = await createOpenSessionSale(user.id);
      const { sale: chargeSale } = await createOpenSessionSale(user.id);
      const card = await issueGiftCard({
        code: `GC-USED-${Date.now()}`,
        initialValue: 30,
        issuedTransactionId: issueSale.id,
        createdBy: user.id,
      });
      await chargeGiftCard({
        giftCardId: card.id,
        salesTransactionId: chargeSale.id,
        amount: 5,
        createdBy: user.id,
      });
      expect(await isGiftCardUsed(card.id)).toBe(true);
      await expect(issueSale.destroy()).rejects.toMatchObject({ status: 424 });
      expect(await GiftCard.findByPk(card.id)).not.toBeNull();
      expect(await SalesTransaction.findByPk(issueSale.id)).not.toBeNull();
    });

    it.each(["refund_recredit", "manual_adjustment", "expire"])(
      "refuses sale delete when issued card has %s movement",
      async (type) => {
        const user = await createUser();
        const { sale: issueSale } = await createOpenSessionSale(user.id);
        const { sale: otherSale } = await createOpenSessionSale(user.id);
        const card = await issueGiftCard({
          code: `GC-${type}-${Date.now()}`,
          initialValue: 30,
          issuedTransactionId: issueSale.id,
          createdBy: user.id,
        });
        await GiftCardTransaction.create({
          gift_card_id: card.id,
          sales_transaction_id: otherSale.id,
          type,
          amount: type === "expire" ? -30 : 5,
          created_by: user.id,
        });
        await expect(issueSale.destroy()).rejects.toMatchObject({ status: 424 });
      },
    );

    it("refuses sale delete when card has payment usage", async () => {
      const user = await createUser();
      const { sale: issueSale } = await createOpenSessionSale(user.id);
      const { sale: paySale } = await createOpenSessionSale(user.id);
      const card = await issueGiftCard({
        code: `GC-PAY-${Date.now()}`,
        initialValue: 40,
        issuedTransactionId: issueSale.id,
        createdBy: user.id,
      });
      await TransactionPayment.create({
        sales_transaction_id: paySale.id,
        method: "giftcard",
        amount: 10,
        gift_card_id: card.id,
      });
      await expect(issueSale.destroy()).rejects.toMatchObject({ status: 424 });
    });

    it("does not delete a card only charged on this sale (not issued here)", async () => {
      const user = await createUser();
      const { sale: issueSale } = await createOpenSessionSale(user.id);
      const { sale: chargeSale } = await createOpenSessionSale(user.id);
      const card = await issueGiftCard({
        code: `GC-OTHER-${Date.now()}`,
        initialValue: 40,
        issuedTransactionId: issueSale.id,
        createdBy: user.id,
      });
      await chargeGiftCard({
        giftCardId: card.id,
        salesTransactionId: chargeSale.id,
        amount: 8,
        createdBy: user.id,
      });
      await chargeSale.destroy();
      expect(await GiftCard.findByPk(card.id)).not.toBeNull();
    });

    it("deletes refund-issued unused card with refund sale", async () => {
      const user = await createUser();
      const { sale: refundSale } = await createOpenSessionSale(user.id);
      await refundSale.update({ transactionType: "refund" });
      const card = await issueGiftCard({
        code: `GC-REFUND-${Date.now()}`,
        initialValue: 15,
        issuedRefundTransactionId: refundSale.id,
        createdBy: user.id,
      });
      await refundSale.destroy();
      expect(await GiftCard.findByPk(card.id)).toBeNull();
    });
  });

  describe("weekday 0", () => {
    it("creates employee workday with Sunday = 0", async () => {
      const { Employee, EmployeeWorkdays } = db;
      const emp = await Employee.create({
        nom: "Test",
        prenom: "Sun",
        email: `sun_${Date.now()}@test.com`,
        isActive: true,
      });
      const w = await EmployeeWorkdays.create({
        employee_id: emp.id,
        day_of_week: 0,
        time_slot: "morning",
        is_working: true,
        start_time: "09:00:00",
        end_time: "12:00:00",
      });
      expect(w.day_of_week).toBe(0);
    });
  });
});
