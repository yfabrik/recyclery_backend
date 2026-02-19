import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../src/v1/controllers/employees.js";
const { Employee, Recyclery, EmployeeWorkdays } = db;

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
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("employees controller functions", () => {
  it("should list employees", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listEmployees(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Array),
      }),
    );
  });

  it("should create an employee", async () => {
    const body = {
      nom: "Dupont",
      prenom: "Jean",
      email: "jean.dupont@test.com",
      phone: "+33 6 12 34 56 78",
      isActive: true,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "employee ajouté",
        data: expect.objectContaining({
          id: expect.any(Number),
          nom: "Dupont",
          prenom: "Jean",
          email: "jean.dupont@test.com",
        }),
      }),
    );
  });

  it("should fail to create employee without required fields", async () => {
    const body = {
      email: "incomplete@test.com",
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(createEmployee(req, res)).rejects.toThrow();
  });

  it("should update an employee", async () => {
    const body = {
      nom: "Dupont",
      prenom: "Jean-Pierre",
      email: "jean.dupont@test.com",
      phone: "+33 6 12 34 56 78",
      isActive: true,
    };
    const req = {
      params: { id: 1 },
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await updateEmployee(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "employee mis à jour",
        data: expect.objectContaining({
          prenom: "Jean-Pierre",
        }),
      }),
    );
  });

  it("should fail to update non-existent employee", async () => {
    const body = {
      nom: "Unknown",
      prenom: "Person",
      email: "unknown@test.com",
    };
    const req = {
      params: { id: 999 },
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await expect(updateEmployee(req, res)).rejects.toThrow();
  });

  it("should delete an employee", async () => {
    // Create another employee first
    const createBody = {
      nom: "Martin",
      prenom: "Marie",
      email: "marie.martin@test.com",
      phone: "+33 6 98 76 54 32",
      isActive: true,
    };
    const createReq = {
      body: createBody,
      user: { id: 1, role: "admin" },
    };
    const createRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    await createEmployee(createReq, createRes);
    const createdEmployee = createRes.json.mock.calls[0][0].data;

    const req = {
      params: { id: createdEmployee.id },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteEmployee(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "employee supprimé",
      }),
    );
  });

  it("should fail to delete non-existent employee", async () => {
    const req = {
      params: { id: 999 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await expect(deleteEmployee(req, res)).rejects.toThrow();
  });
});
