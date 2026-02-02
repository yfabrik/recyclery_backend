import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  createStoreLocation,
  updateStoreLocation,
  deleteStoreLocation,
  listStoreLocation,
} from "../../src/v1/controllers/storeLocation.js";
const { StoreLocation, Recyclery } = db;

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

describe("storeLocation controller functions", () => {
  it("should create a store location", async () => {
    const body = {
      name: "Rayon Électronique",
      description: "Rayon dédié aux appareils électroniques et informatiques",
      store_id: 1,
      is_active: true,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createStoreLocation(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lieu créé avec succès",
        location: expect.objectContaining({
          id: expect.any(Number),
          name: "Rayon Électronique",
          store_id: 1,
        }),
      })
    );
  });

  it("should fail to create location without required fields", async () => {
    const body = {
      description: "Missing name and store_id",
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createStoreLocation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Le nom et le magasin sont requis",
      })
    );
  });

  it("should list store locations", async () => {
    const req = {
      params: { storeId: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listStoreLocation(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        locations: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            store_id: 1,
          }),
        ]),
      })
    );
  });

  it("should update a store location", async () => {
    const body = {
      name: "Rayon Électronique Mise à jour",
      description: "Rayon mis à jour avec nouvelles catégories",
      store_id: 1,
      is_active: true,
    };
    const req = {
      params: { id: 1 },
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await updateStoreLocation(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lieu mis à jour avec succès",
        location: expect.objectContaining({
          id: 1,
          name: "Rayon Électronique Mise à jour",
        }),
      })
    );
  });

  it("should fail to update non-existent location", async () => {
    const body = {
      name: "Non-existent",
      store_id: 1,
    };
    const req = {
      params: { id: 999 },
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updateStoreLocation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lieu non trouvé",
      })
    );
  });

  it("should delete a store location", async () => {
    // Create another location first
    const createBody = {
      name: "Rayon Mobilier",
      description: "Rayon dédié aux meubles",
      store_id: 1,
      is_active: true,
    };
    const createReq = {
      body: createBody,
      user: { id: 1, role: "admin" },
    };
    const createRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    await createStoreLocation(createReq, createRes);
    const createdLocation = createRes.json.mock.calls[0][0].location;

    const req = {
      params: { id: createdLocation.id },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteStoreLocation(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lieu supprimé avec succès",
      })
    );
  });

  it("should fail to delete non-existent location", async () => {
    const req = {
      params: { id: 999 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await deleteStoreLocation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lieu non trouvé",
      })
    );
  });
});
