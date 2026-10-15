import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index";

import {
  createArrival,
  deleteArrival,
  detailArrival,
  listArrivals,
  statsByCategories,
  updateArrival,
} from "../../src/v1/controllers/arrivals";
import { makeReq, makeRes, expectHttpError } from "./helpers.js";
import { IOValues } from "../../src/constants/categoryIO.js";
const { Recyclery, Category, User, CollectionPoint, Arrival } = db;

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
  await Category.create({ name: "Électronique", IO: IOValues.IN });
  await Category.create({ name: "Mobilier", parent_id: 1, IO: IOValues.IN });
  await User.create({
    email: "employee@test.com",
    username: "testemployee",
    role: "employee",
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

describe("arrival controller functions", () => {
  it("should create an arrival from collection point", async () => {
    const arrivalDate = new Date("2026-01-28T10:00:00Z");
    const body = {
      category_id: 1,
      subcategory_id: 2,
      weight: 15.5,
      arrival_date: arrivalDate,
      arrival_time: "10:30",
      source_type: "point",
      collection_point_id: 1,
      notes: "Collecte matin - bon état général",
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

    await createArrival(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(Number),
          category_id: 1,
          subcategory_id: 2,
          weight: 15.5,
          source_type: "point",
        }),
        success: true,
        message: "Arrivage créé avec succès",
      }),
    );
  });

  it("should create an arrival from direct donation", async () => {
    const arrivalDate = new Date("2026-01-28T14:00:00Z");
    const body = {
      category_id: 1,
      subcategory_id: 2,
      weight: 8.2,
      arrival_date: arrivalDate,
      arrival_time: "14:15",
      source_type: "apport",
      source_details: "Donation directe d'un particulier",
      notes: "Meubles en bon état",
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

    await createArrival(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
        success: true,
      }),
    );
  });

  it("should list arrivals", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listArrivals(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            weight: expect.any(Number),
            source_type: expect.any(String),
          }),
        ]),
        success: true,
      }),
    );
  });

  it("should list arrivals filtered by source type", async () => {
    const req = {
      query: { source_type: "point" },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listArrivals(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        success: true,
      }),
    );
    const response = res.json.mock.calls[0][0];
    if (response.data.length > 0) {
      expect(
        response.data.every((arr) => arr.source_type === "point"),
      ).toBe(true);
    }
  });

  it("should find arrival by id", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await detailArrival(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 1,
          weight: expect.any(Number),
        }),
        success: true,
      }),
    );
  });

  it("should update arrival", async () => {
    const arrivalDate = new Date("2026-01-28T16:00:00Z");
    const body = {
      category_id: 1,
      subcategory_id: 2,
      weight: 20.0,
      arrival_date: arrivalDate,
      arrival_time: "16:30",
      source_type: "point",
      collection_point_id: 1,
      notes: "Mise à jour - poids corrigé",
    };
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await updateArrival(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Arrivage mis à jour avec succès",
      }),
    );
  });

  it("should delete arrival", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteArrival(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Arrivage supprimé avec succès",
      }),
    );
  });

  it("should fail to find non-existent arrival", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 999 },
    };

    const res = {
      json: jest.fn(),
    };

    await expect(detailArrival(req, res)).rejects.toThrow();
  });

  it("should list arrivals filtered by date range", async () => {
    const req = {
      query: {
        date_from: "2026-01-01",
        date_to: "2026-01-31",
      },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listArrivals(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        success: true,
      }),
    );
  });

  it("should list arrivals filtered by category", async () => {
    const req = {
      query: { category_id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listArrivals(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        success: true,
      }),
    );
  });

  it("rejects arrival without subcategory when parent has children", async () => {
    const res = makeRes();
    await expectHttpError(
      () =>
        createArrival(
          makeReq({
            body: {
              category_id: 1,
              weight: 5,
              arrival_date: new Date("2026-02-01"),
              arrival_time: "10:00",
              source_type: "apport",
            },
          }),
          res,
        ),
      400,
    );
  });

  it("rejects point source without collection_point_id", async () => {
    const res = makeRes();
    await expect(
      createArrival(
        makeReq({
          body: {
            category_id: 1,
            subcategory_id: 2,
            weight: 5,
            arrival_date: new Date("2026-02-01"),
            arrival_time: "10:00",
            source_type: "point",
          },
        }),
        res,
      ),
    ).rejects.toThrow();
  });

  it("rejects point source with fake collection_point_id", async () => {
    const res = makeRes();
    await expectHttpError(
      () =>
        createArrival(
          makeReq({
            body: {
              category_id: 1,
              subcategory_id: 2,
              weight: 5,
              arrival_date: new Date("2026-02-01"),
              arrival_time: "10:00",
              source_type: "point",
              collection_point_id: 999,
            },
          }),
          res,
        ),
      404,
    );
  });

  it("clears collection_point_id when source is not point", async () => {
    const res = makeRes();
    await createArrival(
      makeReq({
        body: {
          category_id: 1,
          subcategory_id: 2,
          weight: 3,
          arrival_date: new Date("2026-02-02"),
          arrival_time: "10:00",
          source_type: "apport",
          collection_point_id: 1,
        },
      }),
      res,
    );
    const arrival = await Arrival.findByPk(
      res.json.mock.calls[0][0].data.id,
    );
    expect(arrival.collection_point_id).toBeNull();
  });
});

describe("arrival statsByCategories", () => {
  const stats = async (query) => {
    const res = makeRes();
    await statsByCategories(makeReq({ query }), res);
    return res.json.mock.calls[0][0].data;
  };
  const byName = (rows, name) => rows.find((r) => r.categorie?.name === name);

  beforeAll(async () => {
    const textile = await Category.create({ name: "Textile", IO: IOValues.IN });
    const otherPoint = await CollectionPoint.create({
      name: "Point Nord",
      address: "1 Rue Nord",
      city: "Orgelet",
      postal_code: "39270",
    });
    const base = { processed_by: 1, arrival_time: "10:00" };
    await Arrival.bulkCreate([
      { ...base, category_id: textile.id, weight: 10, arrival_date: new Date("2025-06-10"), source_type: "point", collection_point_id: 1 },
      { ...base, category_id: textile.id, weight: 5, arrival_date: new Date("2025-06-11"), source_type: "point", collection_point_id: otherPoint.id },
      { ...base, category_id: textile.id, weight: 2, arrival_date: new Date("2025-06-12"), source_type: "apport" },
      { ...base, category_id: 1, subcategory_id: 2, weight: 7, arrival_date: new Date("2025-06-12"), source_type: "apport" },
      { ...base, category_id: 1, subcategory_id: 2, weight: 3, arrival_date: new Date("2025-07-20"), source_type: "point", collection_point_id: 1 },
    ]);
  });

  const june = { date_from: "2025-06-01", date_to: "2025-06-30" };

  it("groups count and weight per category", async () => {
    const rows = await stats(june);
    expect(rows).toHaveLength(2);
    expect(byName(rows, "Textile")).toMatchObject({ count: 3, total_weight: 17 });
    expect(byName(rows, "Électronique")).toMatchObject({ count: 1, total_weight: 7 });
  });

  it("applies the date range", async () => {
    const rows = await stats({ date_from: "2025-07-01", date_to: "2025-07-31" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 1, total_weight: 3 });
  });

  it("filters by category_id", async () => {
    const textile = await Category.findOne({ where: { name: "Textile" } });
    const rows = await stats({ ...june, category_id: textile.id });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 3, total_weight: 17 });
  });

  it("filters by source_type", async () => {
    const rows = await stats({ ...june, source_type: "point" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 2, total_weight: 15 });
    expect(rows[0].categorie.name).toBe("Textile");
  });

  it("filters by collection_point_id when source_type is point", async () => {
    const rows = await stats({ ...june, source_type: "point", collection_point_id: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 1, total_weight: 10 });
  });

  it("ignores collection_point_id when source_type is not point", async () => {
    const rows = await stats({ ...june, source_type: "apport", collection_point_id: 1 });
    expect(rows).toHaveLength(2);
    expect(byName(rows, "Textile")).toMatchObject({ count: 1, total_weight: 2 });
  });
});
