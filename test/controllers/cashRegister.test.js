import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index";
import {
  createCaisse,
  deleteCaisse,
  detailCaisse,
  listCaisses,
  updateCaisse,
} from "../../src/v1/controllers/cashRegister";
import { createRecyclery, createUser } from "../models/helpers.js";
import { makeReq, makeRes } from "./helpers.js";
const { Recyclery, CashRegister, CashSession } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  await Recyclery.create({
    name: "Recyclerie Test Orgelet",
    address: "123 Rue de la Recyclerie",
    phone: "+33 1 23 45 67 89",
    email: "recyclery.orgelet@test.com",
    city: "Orgelet",
    postal_code: "39270",
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("caisses controller functions", () => {
  it("should create a caisse for recyclerie 1", async () => {
    const body = {
      name: "Caisse Principale",
      store_id: 1,
      is_active: true,
    };
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createCaisse(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(Number),
          name: "Caisse Principale",
          recyclery_id: 1,
        }),
        success: true,
        message: "Caisse créée avec succès",
      }),
    );
  });

  it("should fail to create duplicate caisse name in same store", async () => {
    const body = {
      name: "Caisse Principale",
      store_id: 1,
    };
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(createCaisse(req, res)).rejects.toThrow();
  });

  it("should find the caisse by id", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await detailCaisse(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toBeDefined();
    expect(payload.data.Recyclery).toBeDefined();
    if (payload.data.store_name !== undefined)
      expect(typeof payload.data.store_name).toBe("string");
    if (payload.data.total_sessions !== undefined)
      expect(typeof payload.data.total_sessions).toBe("number");
    if (payload.data.sessions !== undefined)
      expect(Array.isArray(payload.data.sessions)).toBe(true);
  });

  it("should update caisse", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body: {
        name: "Caisse Principale Modifiée",
        is_active: true,
      },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updateCaisse(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
        success: true,
        message: "Caisse mise à jour avec succès",
      }),
    );
  });

  it("should list caisses for recyclerie 1", async () => {
    const req = {
      params: {}, // Controller expects params (even if empty)
      query: { store_id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listCaisses(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        success: true,
      }),
    );
  });

  it("should delete caisse", async () => {
    const req = {
      query: { store_id: 1 },
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteCaisse(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Caisse supprimée avec succès",
      }),
    );
  });

  it("allows same register name in a different store", async () => {
    const store2 = await createRecyclery({ name: "Second Store" });
    const res = makeRes();
    await createCaisse(
      makeReq({
        body: { name: "Caisse Principale", store_id: store2.id },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data.name).toBe("Caisse Principale");
  });

  it("keeps sessions when register is updated", async () => {
    const user = await createUser();
    const store = await Recyclery.create({
      name: "Store Sessions",
      address: "addr",
      email: "sessions@test.com",
    });
    const register = await CashRegister.create({
      name: "Session Register",
      recyclery_id: store.id,
      is_active: true,
    });
    await CashSession.create({
      cash_register_id: register.id,
      user_id: user.id,
      opening_amount: 100,
      status: "open",
    });

    const res = makeRes();
    await updateCaisse(
      makeReq({
        params: { id: register.id },
        body: { name: "Renamed Register", is_active: true },
      }),
      res,
    );

    const reloaded = await CashRegister.findByPk(register.id, {
      include: [{ model: CashSession, as: "sessions" }],
    });
    expect(reloaded.sessions).toHaveLength(1);
    expect(reloaded.name).toBe("Renamed Register");
  });
});
