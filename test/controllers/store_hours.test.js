import { beforeAll, jest } from "@jest/globals";
import db from "../../src/models";

import {
  addHoraire,
  listHoraires,
  removeHoraires,
  updateHoraire,
} from "../../src/v1/controllers/storeHours.js";
const { Recyclery, Category, User } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  await Recyclery.create({
    name: "recyclerie test",
    address: "address test",
    phone: "0123456789",
    email: "recyclery@test.com",
    // manager_id,
    city: "orgelet",
    postal_code: "39270",
  });
  await Category.create({ name: "a" });
  await Category.create({ name: "b" });
  await User.create({ email: "a@example.com" });
});

describe("store_hours controller functions", () => {
  it("should create a new horaires  pour recyclerie test", async () => {
    const body = {
      store_id: 1,
      day_of_week: "monday",
      time_slot_name: "Matin",
      is_open: true,
      open_time: "09:00",
      close_time: "18:00",
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
        id: 1,
        success: true,
      })
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
        arrivals: expect(
          Array.every((obj) => {
            expect(obj).toHaveProperty("id");
            expect(obj).toHaveProperty("day_of_week");
            expect(obj).toHaveProperty("time_slot_name");
          })
        ),
        success: true,
      })
    );
  });
  it("should update horaire 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body: {
        store_id: 1,
        day_of_week: "tuesday",
        time_slot_name: "Matin",
      },
    };

    const res = {
      json: jest.fn(),
    };

    await updateHoraire(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        horaire: expect.objectContaining({
          day_of_week: "tuesday",
        }),
        success: true,
      })
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
      expect.objectContaining({ success: true })
    );
  });
});
