import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  createLabeledItem,
  deleteLabeledItem,
  listLabeledItem,
} from "../../src/v1/controllers/items.js";
const { Recyclery, Category, User } = db;

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
  await Category.create({ name: "Électronique" });
  await Category.create({ name: "Ordinateurs", parent_id: 1 });
  await User.create({
    email: "employee@test.com",
    username: "testemployee",
    role: "employee",
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("item controller functions", () => {
  it("should create a labeled item", async () => {
    const body = {
      name: "Ordinateur portable Dell Latitude",
      description:
        "Ordinateur portable Dell Latitude E5420, Intel Core i5, 8GB RAM, 500GB HDD, écran 14 pouces",
      category_id: 1,
      subcategory_id: 2,
      weight: 2.5,
      price: 250.0,
      cost: 150.0,
      condition_state: "good",
      location: "Rayon Électronique - Étagère A3",
      selling_price: 250.0,
      recyclery_id: 1,
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

    await createLabeledItem(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Article créé avec succès",
      item: expect.objectContaining({
        id: expect.any(Number),
        description:
          "Ordinateur portable Dell Latitude E5420, Intel Core i5, 8GB RAM, 500GB HDD, écran 14 pouces",
        category_id: 1,
        weight: 2.5,
      }),
    });
  });

  it("should list items", async () => {
    const req = {
      query: { store_id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listLabeledItem(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        success: true,
      }),
    );
  });

  it("should list items filtered by category", async () => {
    const req = {
      query: {
        store_id: 1,
        category_id: 1,
      },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listLabeledItem(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        success: true,
      }),
    );
  });

  it.skip("should list items with search query", async () => {
    const req = {
      query: {
        store_id: 1,
        search: "Dell",
      },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listLabeledItem(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        success: true,
      }),
    );
  });

  it("should delete labeled item", async () => {
    const req = {
      query: { store_id: 1 },
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteLabeledItem(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Article supprimé avec succès",
        success: true,
      }),
    );
  });
});
