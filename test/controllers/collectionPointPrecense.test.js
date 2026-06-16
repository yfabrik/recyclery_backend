import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index";
import {
  createPointPrecense,
  deletePointPrecense,
  detailPointPrecense,
  listPointPrecense,
} from "../../src/v1/controllers/collectionPointPrecense";
import {
  deleteCollectionPoint,
  updateCollectionPoint,
} from "../../src/v1/controllers/collectionPoints";
import { makeReq, makeRes, expectHttpError } from "./helpers.js";
const { User, CollectionPoint, Recyclery, TaskSchedule } = db;

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

  it("rejects presence with fake collection point", async () => {
    const res = makeRes();
    await expectHttpError(
      () =>
        createPointPrecense(
          makeReq({
            body: {
              collection_point_id: 999,
              store_id: 1,
              day_of_week: "Mardi",
              is_present: true,
              start_time: "09:00",
              end_time: "12:00",
            },
          }),
          res,
        ),
      404,
    );
  });

  it("updates presence name when collection point is renamed", async () => {
    const point = await CollectionPoint.create({
      name: "Rename Point",
      address: "addr",
      city: "city",
      postal_code: "39000",
      recyclery_id: 1,
    });

    const createRes = makeRes();
    await createPointPrecense(
      makeReq({
        body: {
          collection_point_id: point.id,
          store_id: 1,
          day_of_week: "Mercredi",
          is_present: true,
          start_time: "10:00",
          end_time: "11:00",
        },
      }),
      createRes,
    );
    const scheduleId = createRes.json.mock.calls[0][0].presence.id;

    const updateRes = makeRes();
    await updateCollectionPoint(
      makeReq({
        params: { id: point.id },
        body: {
          name: "Renamed Point",
          address: "addr",
          city: "city",
          postal_code: "39000",
        },
      }),
      updateRes,
    );

    const schedule = await TaskSchedule.findByPk(scheduleId);
    expect(schedule.name).toBe("Renamed Point");
  });

  it("deletes presence schedules when collection point is deleted", async () => {
    const point = await CollectionPoint.create({
      name: "Delete Point",
      address: "addr",
      city: "city",
      postal_code: "39000",
      recyclery_id: 1,
    });

    const createRes = makeRes();
    await createPointPrecense(
      makeReq({
        body: {
          collection_point_id: point.id,
          store_id: 1,
          day_of_week: "Jeudi",
          is_present: true,
          start_time: "14:00",
          end_time: "16:00",
        },
      }),
      createRes,
    );
    const scheduleId = createRes.json.mock.calls[0][0].presence.id;

    const delRes = makeRes();
    await deleteCollectionPoint(
      makeReq({ params: { id: point.id } }),
      delRes,
    );

    const schedule = await TaskSchedule.findByPk(scheduleId);
    expect(schedule).toBeNull();
  });
});
