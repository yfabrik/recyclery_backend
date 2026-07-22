import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index";

import {
  addHoraire,
  listHoraires,
  removeHoraires,
  updateHoraire,
} from "../../src/v1/controllers/storeHours";
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
  await Category.create({ name: "Mobilier", parent_id: 1 });
  await User.create({
    email: "employee@test.com",
    username: "testemployee",
    role: "employee",
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("store_hours controller functions", () => {
  it("should create a new horaires  pour recyclerie test", async () => {
    const body = {
      store_id: 1,
      day_of_week: 1, // Monday
      time_slot_name: "Matin",
      is_open: true,
      start_time: "09:00",
      end_time: "18:00",
      is_24h: false,
      notes: "",
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

    await addHoraire(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id: 1 },
        success: true,
      }),
    );
  });

  it("should list horaires", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listHoraires(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            day_of_week: expect.any(Number),
            name: expect.any(String),
          }),
        ]),
        success: true,
      }),
    );
  });
  it.skip("should update horaire", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body: {
        store_id: 1,
        day_of_week: 2, // Tuesday
        start_time: "10:00",
        end_time: "19:00",
        is_open: true,
      },
    };

    const res = {
      json: jest.fn(),
    };

    await updateHoraire(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        horaire: expect.any(Object),
        success: true,
        message: "Horaires mis à jour avec succès",
      }),
    );
  });
  it("should delete horaire 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await removeHoraires(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
