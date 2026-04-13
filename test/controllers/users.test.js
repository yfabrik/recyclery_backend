import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index";
import {
  createUser,
  deleteUser,
  findUserById,
  listUsers,
  updateUser,
} from "../../src/v1/controllers/users";

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("User controller functions", () => {
  it("should create user", async () => {
    const body = {
      username: "john_doe",
      email: "john.doe@test.com",
      password: "SecurePassword123!",
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
          username: "john_doe",
          email: "john.doe@test.com",
          role: "employee",
        }),
        success: true,
        message: "Utilisateur créé avec succès",
      }),
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
          username: "john_doe",
          email: "john.doe@test.com",
          role: "employee",
        }),
      }),
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
      expect.objectContaining({ users: expect.any(Array) }),
    );
  });

  it("should list users with more info", async () => {
    const req = {
      query: { include: "managedStores" },
    };

    const res = {
      json: jest.fn(),
    };

    await listUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        users: expect.any(Array),
      }),
    );
    const users = res.json.mock.calls[0][0].users;
    expect(users.length).toBeGreaterThanOrEqual(0);
    if (users.length > 0 && users[0].managedStores !== undefined) {
      expect(users[0].managedStores).toEqual(expect.any(Array));
    }
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
      }),
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

    await expect(findUserById(req, res)).rejects.toThrow();
  });

  it("should create user with different roles", async () => {
    const body = {
      username: "manager_user",
      email: "manager@test.com",
      password: "SecurePassword123!",
      role: "manager",
    };
    const req = {
      query: {},
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await createUser(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          username: "manager_user",
          email: "manager@test.com",
          role: "manager",
        }),
        success: true,
      }),
    );
  });

  it("should filter users by role", async () => {
    const req = {
      query: { role: "manager" },
    };

    const res = {
      json: jest.fn(),
    };

    await listUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        users: expect.arrayContaining([
          expect.objectContaining({
            role: "manager",
          }),
        ]),
      }),
    );
  });
});
