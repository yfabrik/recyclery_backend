import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index";
import {
  createPointPrecense,
  deletePointPrecense,
  detailPointPrecense,
  listPointPrecense,
} from "../../src/v1/controllers/collectionPointPrecense";
const { User, CollectionPoint, Recyclery } = db;

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
  await CollectionPoint.create({
    name: "Point de collecte Centre-ville",
    address: "45 Avenue Principale",
    city: "Orgelet",
    postal_code: "39270",
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("collection schedule controller functions", () => {
  it("should create a point presence", async () => {
    const body = {
      collection_point_id: 1,
      store_id: 1,
      day_of_week: "Lundi",
      is_present: true,
      start_time: "09:00",
      end_time: "12:00",
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

    await createPointPrecense(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  it("should list point precense", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listPointPrecense(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        schedules: expect.any(Array),
        success: true,
      }),
    );
  });

  it("should find the point precense 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await detailPointPrecense(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.any(Object),
        success: true,
      }),
    );
  });
  it("should remove point precense 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await deletePointPrecense(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
