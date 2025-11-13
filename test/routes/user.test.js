// import { jest } from "@jest/globals";
// import request from "supertest";
// import { app } from "../../src/index.js";
// import db from "../../src/models/index.js";
// const { User, Recyclery } = db;

// // 👇 Mock the auth middleware module
// jest.mock("../../src/middlewares/auth.js", () => ({
//   authenticateToken: (req, res, next) => {
//     // You can even simulate user context here
//     req.user = { id: 1, role: "admin" };
//     next();
//   },
// }));

// beforeAll(async () => {
//   // await db.sequelize.sync({ force: true });

//   // Seed a recyclery
//   await Recyclery.create({
//     name: "Eco Center",
//     address: "123 Green St",
//     phone: "0000000000",
//     email: "eco@center.com",
//   });
// });

// afterAll(async () => {
//   // await db.sequelize.close();
// });

// describe("User Endpoints", () => {
//   test("POST /users → should create a user", async () => {
//     const res = await request(app).post("/users").send({
//       username: "john",
//       email: "john@example.com",
//       password: "secret",
//       role: "employee",
//       // recyclery_id: 1,
//     });

//     expect(res.statusCode).toBe(200);
//     expect(res.body.user.username).toBe("john");
//   });

//   test("GET /users → should list all users", async () => {
//     const res = await request(app).get("/users");
//     expect(res.statusCode).toBe(200);
//     expect(Array.isArray(res.body.users)).toBe(true);
//     expect(res.body.users.length).toBeGreaterThan(0);
//   });

//   test("GET /users/employees → should list only employees", async () => {
//     const res = await request(app).get("/users/employees");
//     expect(res.statusCode).toBe(200);
//     expect(res.body.users.every((u) => u.role === "employee")).toBe(true);
//   });

//   test("GET /users/:id → should return a specific user", async () => {
//     const user = await User.findOne();
//     const res = await request(app).get(`/users/${user.id}`);
//     expect(res.statusCode).toBe(200);
//     expect(res.body.user.id).toBe(user.id);
//   });

//   test("POST /users → should fail if user already exists", async () => {
//     const res = await request(app).post("/users").send({
//       username: "john",
//       email: "john@example.com",
//       password: "123",
//     });
//     expect(res.statusCode).toBe(409); // Conflict
//   });
// });
