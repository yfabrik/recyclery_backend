import db from "../../src/models";
const { User, Recyclery } = db;

describe("User Model", () => {


  it("should create a new user", async () => {
    const recyclery = await Recyclery.create({
      name: "Eco Center",
      address: "123 Green St",
      email: "eco@center.com",
    });

    const userData = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      role: "employee",
      recyclery_id: recyclery.id,
    };

    const user = await User.create(userData);

    expect(user.id).toBeDefined();
    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.role).toBe("employee");
  });

  it("should enforce unique email", async () => {
    await expect(
      User.create({
        username: "another",
        email: "test@example.com",
        password: "xxx",
      })
    ).rejects.toThrow();
  });
});
