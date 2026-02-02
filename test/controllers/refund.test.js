import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  listRefunds,
  updateRefund,
  detailRefund,
  refundStats,
} from "../../src/v1/controllers/refund.js";
const { Refund, Recyclery, User, SalesTransaction, CashRegister, CashSession } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  await User.create({
    email: "cashier@test.com",
    username: "cashier1",
    role: "employee",
  });
  await Recyclery.create({
    name: "Recyclerie Test Orgelet",
    address: "123 Rue de la Recyclerie",
    phone: "+33 1 23 45 67 89",
    email: "recyclery.orgelet@test.com",
    city: "Orgelet",
    postal_code: "39270",
  });
  await CashRegister.create({
    name: "Caisse Principale",
    recyclery_id: 1,
    is_active: true,
  });
  await CashSession.create({
    cash_register_id: 1,
    user_id: 1,
    opening_amount: 500.00,
    recyclery_id: 1,
    status: "open",
  });
  const transaction = await SalesTransaction.create({
    cash_session_id: 1,
    store_id: 1,
    total_amount: 45.50,
    payment_method: "cash",
    payment_amount: 50.00,
    change_amount: 4.50,
  });
  await Refund.create({
    transaction_id: transaction.id,
    store_id: 1,
    refund_type: "full",
    refund_amount: 45.50,
    refund_reason: "Article défectueux",
    status: "pending",
    processed_by: 1,
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("refund controller functions", () => {
  it("should list refunds", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listRefunds(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        refunds: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            refund_amount: expect.any(Number),
            computed_status: expect.any(String),
          }),
        ]),
      })
    );
  });

  it("should list refunds filtered by store_id", async () => {
    const req = {
      query: { store_id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listRefunds(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        refunds: expect.any(Array),
      })
    );
  });

  it("should list refunds filtered by status", async () => {
    const req = {
      query: { status: "pending" },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listRefunds(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        refunds: expect.any(Array),
      })
    );
  });

  it("should get refund detail", async () => {
    const req = {
      params: { id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await detailRefund(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        refund: expect.objectContaining({
          id: 1,
          refund_amount: expect.any(Number),
          computed_status: expect.any(String),
          days_since_creation: expect.any(Number),
        }),
      })
    );
  });

  it("should fail to get non-existent refund detail", async () => {
    const req = {
      params: { id: 999 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await detailRefund(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Avoir non trouvé",
      })
    );
  });

  it("should update refund status", async () => {
    const req = {
      params: { id: 1 },
      body: { status: "completed" },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await updateRefund(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Statut mis à jour avec succès",
      })
    );
  });

  it("should fail to update refund with invalid status", async () => {
    const req = {
      params: { id: 1 },
      body: { status: "invalid_status" },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updateRefund(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Statut invalide",
      })
    );
  });

  it("should get refund stats", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await refundStats(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        stats: expect.any(Object),
      })
    );
  });

  it("should get refund stats filtered by store_id", async () => {
    const req = {
      query: { store_id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await refundStats(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        stats: expect.any(Object),
      })
    );
  });
});
