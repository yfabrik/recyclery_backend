import { jest } from "@jest/globals";
import { createUser, deleteUser, listUsers } from "../../src/controllers/users";

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
      user: { id: 1, role: "admin" },
      body,
    };

    const res = {
      json: jest.fn(),
    };

    await createUser(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.any(Object),
        success: true,
        message: "Utilisateur créé avec succès",
      })
    );
  });

  it("should list users", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ users: expect.any(Array) })
    );
  });

  it("should delete the user", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
      params: { id: 1 }
    };

    const res = {
      json: jest.fn(),
    };

    await deleteUser(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "user removed"
      })
    );
  });
});
