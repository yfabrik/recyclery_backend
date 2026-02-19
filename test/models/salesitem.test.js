import db from "../../src/models/index.js";
import { createRecyclery, createUser } from "./helpers.js";

const {
  Category,
  LabeledItem,
  CashRegister,
  CashSession,
  SalesTransaction,
  SalesItem,
} = db;

describe("SalesItem Model", () => {
  describe("CRUD", () => {
    async function createTransaction() {
      const recyclery = await createRecyclery();
      const user = await createUser();
      const category = await Category.create({ name: "S", IO: 0 });
      const item = await LabeledItem.create({
        category_id: category.id,
        recyclery_id: recyclery.id,
        created_by: user.id,
        price: 5,
      });
      const cr = await CashRegister.create({
        name: "C",
        recyclery_id: recyclery.id,
      });
      const session = await CashSession.create({
        cash_register_id: cr.id,
        user_id: user.id,
        opening_amount: 0,
      });
      const tx = await SalesTransaction.create({
        cash_session_id: session.id,
        created_by: user.id,
        payment_method: "cash",
      });
      return { tx, item };
    }

    it("should create a sales item", async () => {
      const { tx, item } = await createTransaction();
      const si = await SalesItem.create({
        transaction_id: tx.id,
        labeled_item_id: item.id,
        name: "Item A",
        price: 5,
        quantity: 1,
        total_price: 5,
      });
      expect(si.id).toBeDefined();
      expect(si.transaction_id).toBe(tx.id);
      expect(si.labeled_item_id).toBe(item.id);
      expect(Number(si.price)).toBe(5);
    });

    it("should read a sales item by primary key", async () => {
      const { tx, item } = await createTransaction();
      const created = await SalesItem.create({
        transaction_id: tx.id,
        labeled_item_id: item.id,
        name: "ReadTest",
        quantity: 2,
      });
      const found = await SalesItem.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe("ReadTest");
    });

    it("should update a sales item", async () => {
      const { tx, item } = await createTransaction();
      const created = await SalesItem.create({
        transaction_id: tx.id,
        labeled_item_id: item.id,
        name: "Before",
        quantity: 1,
      });
      await created.update({ name: "After", quantity: 2 });
      const reloaded = await SalesItem.findByPk(created.id);
      expect(reloaded.name).toBe("After");
      expect(reloaded.quantity).toBe(2);
    });

    it("should delete a sales item", async () => {
      const { tx, item } = await createTransaction();
      const created = await SalesItem.create({
        transaction_id: tx.id,
        labeled_item_id: item.id,
        name: "ToDelete",
      });
      const id = created.id;
      await created.destroy();
      const found = await SalesItem.findByPk(id);
      expect(found).toBeNull();
    });
  });
});
