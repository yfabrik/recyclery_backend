// __tests__/models/user.test.js
import db from "../src/models/index.js";
const { User } = db;

describe("User Model", () => {
  it("should create a new user", async () => {
    const userData = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      role: "employee",
    };

    const user = await User.create(userData);

    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.role).toBe(userData.role);
  });
});
