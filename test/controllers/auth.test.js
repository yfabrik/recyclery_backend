import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index";
import { register, login, userProfile } from "../../src/v1/controllers/auth";

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  // Set JWT_SECRET for testing
  process.env.JWT_SECRET = "test-secret-key-for-jwt";
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("auth controller functions", () => {
  it("should register a new user", async () => {
    const body = {
      username: "newuser",
      email: "newuser@test.com",
      password: "SecurePassword123!",
      role: "employee",
    };
    const req = {
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await register(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Utilisateur créé avec succès",
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(Number),
          username: "newuser",
          email: "newuser@test.com",
          role: "employee",
        }),
      }),
    );
  });

  it("should fail to register duplicate email", async () => {
    const body = {
      username: "anotheruser",
      email: "newuser@test.com",
      password: "AnotherPassword123!",
      role: "employee",
    };
    const req = {
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(register(req, res, jest.fn())).rejects.toThrow();
  });

  it("should fail to register duplicate username", async () => {
    const body = {
      username: "newuser",
      email: "different@test.com",
      password: "AnotherPassword123!",
      role: "employee",
    };
    const req = {
      body,
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await expect(register(req, res, jest.fn())).rejects.toThrow();
  });

  it("should login with valid credentials", async () => {
    const body = {
      email: "newuser@test.com",
      password: "SecurePassword123!",
    };
    const req = {
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await login(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Connexion réussie",
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(Number),
          username: "newuser",
          email: "newuser@test.com",
          role: "employee",
        }),
      }),
    );
  });

  it("should fail to login with invalid email", async () => {
    const body = {
      email: "nonexistent@test.com",
      password: "SecurePassword123!",
    };
    const req = {
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await expect(login(req, res, jest.fn())).rejects.toThrow();
  });

  it("should fail to login with invalid password", async () => {
    const body = {
      email: "newuser@test.com",
      password: "WrongPassword123!",
    };
    const req = {
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await expect(login(req, res, jest.fn())).rejects.toThrow();
  });

  it("should get user profile with admin permissions", async () => {
    const req = {
      user: {
        id: 1,
        username: "admin",
        email: "admin@test.com",
        role: "admin",
      },
    };

    const res = {
      json: jest.fn(),
    };

    await userProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          role: "admin",
        }),
        permissions: expect.arrayContaining(["*"]),
        permissionsByModule: expect.objectContaining({
          dashboard: expect.arrayContaining(["read", "write"]),
          inventory: expect.arrayContaining(["read", "write", "delete"]),
        }),
      }),
    );
  });

  it("should get user profile with manager permissions", async () => {
    const req = {
      user: {
        id: 2,
        username: "manager",
        email: "manager@test.com",
        role: "manager",
      },
    };

    const res = {
      json: jest.fn(),
    };

    await userProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          role: "manager",
        }),
        permissions: expect.arrayContaining(["read", "write"]),
        permissionsByModule: expect.objectContaining({
          dashboard: expect.arrayContaining(["read", "write"]),
        }),
      }),
    );
  });

  it("should get user profile with employee permissions", async () => {
    const req = {
      user: {
        id: 1,
        username: "employee",
        email: "employee@test.com",
        role: "employee",
      },
    };

    const res = {
      json: jest.fn(),
    };

    await userProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          role: "employee",
        }),
        permissions: expect.arrayContaining(["read"]),
        permissionsByModule: expect.objectContaining({
          dashboard: expect.arrayContaining(["read"]),
          sales: expect.arrayContaining(["read", "write"]),
        }),
      }),
    );
  });
});
