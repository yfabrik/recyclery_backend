import { jest } from "@jest/globals";
import {
  createUser,
  deleteUser,
  findUserById,
  listUsers,
  updateUser,
} from "../../src/v1/controllers/users";

describe("User controller functions", () => {
  it("should create user", async () => {
    const body = {
      username: "john",
      email: "john@example.com",
      password: "secret",
      role: "employee",
    };
    const req = {
      query: {},
      // user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await createUser(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          username: "john",
          email: "john@example.com",
          role: "employee",
        }),
        success: true,
        message: "Utilisateur créé avec succès",
      })
    );
  });

  it("should find john", async () => {
    const req = {
      params: { id: 1 },
      // user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await findUserById(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          username: "john",
          email: "john@example.com",
          role: "employee",
        }),
      })
    );
  });
  // it("should update john", async () => {
  //   const req = {
  //     params: { id: 1 },
  //     // user: { id: 1, role: "admin" },
  //     body: {
  //       email: "john2@example.com",
  //       role: "admin",
  //       username:"john"
  //     }
  //   };

  //   const res = {
  //     json: jest.fn(),
  //   };

  //   await updateUser(req, res);
  //   expect(res.json).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       user: expect.objectContaining({
  //         username: "john",
  //         email: "john2@example.com",
  //         role: "admin",
  //       }),
  //     })
  //   );
  // });

  it("should list users", async () => {
    const req = {
      query: {},
      // user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ users: expect.any(Array) })
    );
  });

  it("should list users with more info", async () => {
    const req = {
      query: { include: "EmployeeWorkdays,managedStores,stores" },
      // user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        users: expect.arrayContaining([
          {
            EmployeeWorkdays: expect.any(Array),
            managedStores: expect.any(Array),
            stores: expect.any(Array),
          }
        ])
      })
    );
  });

  it("should delete the user", async () => {
    const req = {
      query: {},
      // user: { id: 1, role: "admin" },
      params: { id: 1 },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteUser(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "user removed",
      })
    );
  });
  it("shouldn't find john", async () => {
    const req = {
      params: { id: 1 },
      // user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    expect(async () => {
      await findUserById(req, res);
    }).rejects.toThrow("NotFoundError");
  });
});
