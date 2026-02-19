import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  dashboardStats,
  dashboardActivities,
  dashboardCharts,
  dashboardStoreStats,
} from "../../src/v1/controllers/dashboard.js";
const {
  LabeledItem,
  SalesTransaction,
  Donation,
  CollectionSchedule,
  Category,
  User,
  CollectionPoint,
  Recyclery,
  CashSession,
} = db;

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
    is_active: true,
  });
  await Category.create({ name: "Électronique" });
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

describe("dashboard controller functions", () => {
  it("should get dashboard stats", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await dashboardStats(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalItems: expect.any(Number),
          availableItems: expect.any(Number),
          soldThisMonth: expect.any(Number),
          totalRevenue: expect.any(Number),
          pendingDonations: expect.any(Number),
          scheduledCollections: expect.any(Number),
          categoriesCount: expect.any(Number),
          usersCount: expect.any(Number),
        }),
      }),
    );
  });

  it("should get dashboard activities", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await dashboardActivities(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Array),
      }),
    );
  });

  it("should get dashboard charts data", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await dashboardCharts(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          sales: expect.any(Array),
          revenue: expect.any(Array),
          labels: expect.any(Array),
        }),
      }),
    );
  });

  it("should get dashboard store stats", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await dashboardStoreStats(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        stores: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            stats: expect.objectContaining({
              currentMonth: expect.objectContaining({
                transactions: expect.any(Number),
                revenue: expect.any(Number),
              }),
            }),
          }),
        ]),
      }),
    );
  });
});
