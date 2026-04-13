import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index";
import {
  createCollectionPoint,
  deleteCollectionPoint,
  detailCollectionPoint,
  listCollectionPoints,
  updateCollectionPoint,
} from "../../src/v1/controllers/collectionPoints";
const { User } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  await User.create({
    email: "employee@test.com",
    username: "testemployee",
    role: "employee",
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("collection points controller functions", () => {
  it("should create a collection point", async () => {
    const body = {
      name: "Point de collecte Centre-ville",
      address: "45 Avenue Principale",
      city: "Orgelet",
      postal_code: "39270",
      contact_person: "JeanDupont",
      contact_phone: "+33 1 23 45 67 89",
      contact_email: "collecte.centreville@test.com",
      type: "standard",
      notes: "Point de collecte principal - accès facile",
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

    await createCollectionPoint(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_point: expect.objectContaining({
          id: expect.any(Number),
          name: "Point de collecte Centre-ville",
          city: "Orgelet",
        }),
        success: true,
      }),
    );
  });

  it("should create another point with same email when no unique constraint", async () => {
    const body = {
      name: "Autre point",
      address: "12 Rue Autre",
      city: "Orgelet",
      postal_code: "39270",
      contact_person: "AutreContact",
      contact_email: "collecte.centreville@test.com",
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

    await createCollectionPoint(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        collection_point: expect.objectContaining({
          name: "Autre point",
          contact_email: "collecte.centreville@test.com",
        }),
      }),
    );
  });
  it("should find the point id 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await detailCollectionPoint(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_point: expect.any(Object),
        success: true,
      }),
    );
  });
  it("should update the collection point", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body: {
        name: "Point de collecte Centre-ville Mise à jour",
        address: "50 Avenue Principale",
        city: "Orgelet",
        postal_code: "39270",
        contact_email: "collecte.centreville@test.com",
      },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updateCollectionPoint(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_point: expect.objectContaining({
          name: "Point de collecte Centre-ville Mise à jour",
          address: "50 Avenue Principale",
          city: "Orgelet",
          postal_code: "39270",
        }),
        success: true,
      }),
    );
  });

  it("should list points", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listCollectionPoints(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_points: expect.any(Array),
        success: true,
      }),
    );
  });

  it("should delete point 1", async () => {
    const req = {
      params: { id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await deleteCollectionPoint(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        success: true,
      }),
    );
  });
});
