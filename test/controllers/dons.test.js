import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index.js";
import { createDon, listDons } from "../../src/v1/controllers/donations.js";
const { User, Recyclery } = db;

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

describe("dons controller functions", () => {
  it("should create a donation", async () => {
    const body = {
      donor_name: "MarieMartin",
      donor_contact: "+33 6 12 34 56 78",
      item_description: "Table en bois massif, 4 chaises, état correct",
      estimated_value: 150.0,
      notes: "Donation généreuse - meubles en bon état général",
      weight: 50,
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

    await createDon(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        donation: expect.objectContaining({
          id: expect.any(Number),
          donor_name: "MarieMartin",
          estimated_value: expect.any(Number),
        }),
      }),
    );
  });

  it("should list dons", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: {},
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listDons(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        donations: expect.any(Array),
      }),
    );
  });
});
