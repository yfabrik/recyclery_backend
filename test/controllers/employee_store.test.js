import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  listEmployeeStore,
  getEmployeeStoreById,
  listStoreEmployee,
  assignUserToStore,
  removeEmployeeStore,
} from "../../src/v1/controllers/employee_store.js";
const { Recyclery, Employee } = db;

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
  await Recyclery.create({
    name: "Recyclerie Test Lons",
    address: "456 Rue de la Recyclerie",
    phone: "+33 1 98 76 54 32",
    email: "recyclery.lons@test.com",
    city: "Lons-le-Saunier",
    postal_code: "39000",
  });
  await Employee.create({
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@test.com",
    phone: "+33 6 12 34 56 78",
    isActive: true,
  });
  await Employee.create({
    nom: "Martin",
    prenom: "Marie",
    email: "marie.martin@test.com",
    phone: "+33 6 98 76 54 32",
    isActive: true,
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("employee_store controller functions", () => {
  it("should list employee store assignments", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listEmployeeStore(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        assignments: expect.any(Array),
      })
    );
  });

  it("should get employee store assignments by employee id", async () => {
    const req = {
      params: { id: 1, employeeId: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await getEmployeeStoreById(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        assignments: expect.any(Array),
        stores: expect.any(Array),
      })
    );
  });

  it("should list store employees", async () => {
    const req = {
      query: { storeId: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listStoreEmployee(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        users: expect.any(Array),
      })
    );
  });

  it("should assign employee to store", async () => {
    const body = {
      employee_id: 1,
      store_id: 1,
      is_primary: true,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await assignUserToStore(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Affectation créée avec succès",
        employee: expect.any(Object),
      })
    );
  });

  it("should assign employee to multiple stores", async () => {
    const body = {
      employee_id: 1,
      store_id: 2,
      is_primary: false,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await assignUserToStore(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Affectation créée avec succès",
      })
    );
  });

  it("should fail to assign non-existent employee", async () => {
    const body = {
      employee_id: 999,
      store_id: 1,
      is_primary: false,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(assignUserToStore(req, res)).rejects.toThrow();
  });

  it("should fail to assign employee to non-existent store", async () => {
    const body = {
      employee_id: 1,
      store_id: 999,
      is_primary: false,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(assignUserToStore(req, res)).rejects.toThrow();
  });

  it("should remove employee from specific store", async () => {
    const req = {
      params: { employeeId: 1, store_id: 2 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await removeEmployeeStore(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining("supprimée"),
      })
    );
  });

  it("should remove all store assignments for employee", async () => {
    const req = {
      params: { employeeId: 2 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await removeEmployeeStore(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining("supprimée"),
      })
    );
  });

  it("should fail to remove assignments for non-existent employee", async () => {
    const req = {
      params: { employeeId: 999 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await expect(removeEmployeeStore(req, res)).rejects.toThrow();
  });
});
