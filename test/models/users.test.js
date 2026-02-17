import db from "../../src/models/index.js";
import { createUser } from "./helpers.js";

const { User } = db;

describe("User Model", () => {
  describe("CRUD", () => {
    it("should create a new user", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        role: "employee",
      };
      const user = await User.create(userData);
      expect(user.id).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe("employee");
    });

    it("should read a user by primary key", async () => {
      const created = await createUser({ username: "readuser", email: "read@example.com" });
      const found = await User.findByPk(created.id);
      expect(found).not.toBeNull();
      expect(found.username).toBe("readuser");
    });

    it("should update a user", async () => {
      const created = await createUser({ username: "before", email: "before@example.com" });
      await created.update({ username: "after", role: "admin" });
      const reloaded = await User.findByPk(created.id);
      expect(reloaded.username).toBe("after");
      expect(reloaded.role).toBe("admin");
    });

    it("should delete a user", async () => {
      const created = await createUser({ username: "todel", email: "todel@example.com" });
      const id = created.id;
      await created.destroy();
      const found = await User.findByPk(id);
      expect(found).toBeNull();
    });

    it("should enforce unique email", async () => {
      await createUser({ username: "u1", email: "unique@example.com" });
      await expect(
        User.create({
          username: "u2",
          email: "unique@example.com",
          password: "xxx",
        })
      ).rejects.toThrow();
    });
  });
});
