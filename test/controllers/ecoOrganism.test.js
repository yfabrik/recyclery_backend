import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index";
import {
  createEcoOrganism,
  deleteEcoOrganism,
  detailEcoOrganism,
  listEcoOrganism,
  updateEcoOrganism,
} from "../../src/v1/controllers/ecoOrganism";

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
  it("should create an eco organism", async () => {
    const body = {
      name: "Eco-Organisme Recyclage Électronique",
      description:
        "Organisme agréé pour la collecte et le recyclage des déchets électroniques",
      contact_email: "contact@eco-org-recyclage.fr",
      contact_phone: "+33 1 23 45 67 89",
      address: "123 Rue de l'Environnement, 75001 Paris",
      website: "https://www.eco-org-recyclage.fr",
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
        data: expect.objectContaining({ id: expect.any(Number) }),
        message: expect.any(String),
        success: true,
      }),
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
        data: expect.any(Array),
      }),
    );
  });
  it("should list active eco organism", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { active: true },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await listEcoOrganism(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
      }),
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
        data: expect.any(Object),
      }),
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
        data: expect.objectContaining({ name: "updated" }),
      }),
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
      }),
    );
  });
});
