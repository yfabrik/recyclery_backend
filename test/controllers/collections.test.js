import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import { listCollections, createCollection } from "../../src/v1/controllers/collections.js";
const { Recyclery, User, Task } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  await User.create({
    email: "employee@test.com",
    username: "testemployee",
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
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("collections controller functions", () => {
  it("should list collections", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listCollections(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collections: expect.any(Array),
      })
    );
  });

  it("should list collections filtered by recyclery_id", async () => {
    const req = {
      query: { recyclery_id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listCollections(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collections: expect.any(Array),
      })
    );
  });

  it("should list collections filtered by status", async () => {
    const req = {
      query: { status: "scheduled" },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listCollections(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collections: expect.any(Array),
      })
    );
  });

  it("should create a collection", async () => {
    const collectionDate = new Date("2026-02-05T09:00:00Z");
    const body = {
      collection_date: collectionDate,
      address: "45 Avenue Principale, Orgelet",
      contact_name: "Jean Dupont",
      contact_phone: "+33 6 12 34 56 78",
      description: "Collecte de meubles et électroménager",
      assigned_to: "1",
      recyclery_id: 1,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createCollection(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Collecte programmée avec succès",
        collection: expect.objectContaining({
          id: expect.any(Number),
          category: "collection",
        }),
      })
    );
  });

  it("should fail to create collection without required fields", async () => {
    const body = {
      address: "45 Avenue Principale",
      contact_name: "Jean Dupont",
      recyclery_id: 1,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(createCollection(req, res)).rejects.toThrow();
  });
});
