import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  createRecyclerie,
  deleteRecyclerie,
  detailRecyclerie,
  listRecycleries,
  updateRecyclerie,
} from "../../src/v1/controllers/recycleries.js";

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("recyclery controller functions", () => {
  it("should create recyclery", async () => {
    const body = {
      name: "Recyclerie Test Orgelet",
      address: "123 Rue de la Recyclerie",
      phone: "+33 1 23 45 67 89",
      email: "recyclery.orgelet@test.com",
      city: "Orgelet",
      postal_code: "39270",
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

    await createRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        recyclery: expect.any(Object),
        // success: true,
        message: "Recyclerie créée avec succès",
      })
    );
  });

  it("should list recyclery", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listRecycleries(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ stores: expect.any(Array) })
    );
  });

  it("should find recyclery 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await detailRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ store: expect.any(Object) })
    );
  });

  it("should update recyclery 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body: { name: "updated" },
    };

    const res = {
      json: jest.fn(),
    };

    await updateRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.objectContaining({ 
          name: "Recyclerie Test Orgelet Mise à jour",
          phone: "+33 1 98 76 54 32"
        }),
      })
    );
  });

  it("should delete recyclery", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Recyclerie supprimée avec succès" })
    );
  });
   it("shouldn't find recyclery 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params:{id:1}
    };

    const res = {
      json: jest.fn(),
    };

    await detailRecyclerie(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ store: null })
    );
  });
});
