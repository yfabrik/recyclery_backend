import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import {
  createEcoOrganism,
  deleteEcoOrganism,
  detailEcoOrganism,
  listActiveEcoOrganism,
  listEcoOrganism,
  updateEcoOrganism,
} from "../../src/v1/controllers/ecoOrganism";

const { User, CollectionPoint, Recyclery } = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  await User.create({ email: "a@example.com", role: "employee" });
  await Recyclery.create({
    name: "recyclerie test",
    address: "address test",
    phone: "0123456789",
    email: "recyclery@test.com",
    // manager_id:1,
    city: "orgelet",
    postal_code: "39270",
  });
  await CollectionPoint.create({
    name: "a",
    address: "ailleur",
    city: "orgelet",
    postal_code: "39270",
  });
});

describe("collection schedule controller functions", () => {
  it("should create a eco organism", async () => {
    const body = {
      name: "a",
      description: "b",
      contact_email: "a@a.fr",
      contact_phone: "0123456789",
      address: "ailleur",
      website: "example.com",
      is_active: true,
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

    await createEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eco_organism_id: expect.any(Number),
        message: expect.any(String),
      })
    );
  });

  it("should list eco organism", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eco_organisms: expect.any(Array),
      })
    );
  });
  it("should list active eco organism", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listActiveEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eco_organisms: expect.any(Array),
      })
    );
  });

  it("should find eco organism 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await detailEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eco_organism: expect.any(Object),
      })
    );
  });
  it("should update eco organism 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
      body: {
        name: "updated",
      },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await updateEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eco_organism: expect.objectContaining({ name: "updated" }),
      })
    );
  });
  it("should remove eco organism 1", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await deleteEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Éco-organisme supprimé avec succès",
      })
    );
  });
});
