// // tests/cashSessionController.test.js
// import { jest } from "@jest/globals";
// import request from "supertest";

// // 1) Mock auth middleware BEFORE importing app/routes
// jest.mock("../../src/middlewares/auth.js", () => ({
//   __esModule: true,
//   authenticateToken: (req, res, next) => {
//     req.user = { id: 1, username: "testUser" };
//     next();
//   },
// }));

describe.skip('my test suite', () => {
  test('does something', () => {
    // ...
  });
});

// // 2) Mock models BEFORE importing app
// const mockCashSession = {
//   findAll: jest.fn(),
//   findOne: jest.fn(),
//   create: jest.fn(),
//   findByPk: jest.fn(),
// };
// const mockCashRegister = {
//   findAll: jest.fn(),
// };
// const mockStore = {};
// const mockUser = {};
// const mockSalesTransaction = {
//   findAll: jest.fn(),
// };
// const mockSalesItem = {};

// // jest.mock("../../src/models/index.js", () => ({
// //   __esModule: true,
// //   default: {
// //     CashSession: mockCashSession,
// //     CashRegister: mockCashRegister,
// //     Store: mockStore,
// //     User: mockUser,
// //     SalesTransaction: mockSalesTransaction,
// //     SalesItem: mockSalesItem,
// //   },
// // }));

// // 3) Now import app (routes will use the mocked middleware and models)
// import { app } from "../../src/index.js";

// describe("CashSession controllers (unit)", () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   test("GET /cash-sessions -> listCashSessions", async () => {
//     mockCashSession.findAll.mockResolvedValue([{ id: 1, status: "open" }]);

//     const res = await request(app).get("/api/cash-sessions");

//     expect(res.statusCode).toBe(200);
//     expect(res.body.success).toBe(true);
//     expect(Array.isArray(res.body.sessions)).toBe(true);
//     expect(mockCashSession.findAll).toHaveBeenCalled();
//   });

//   test("GET /cash-sessions/active -> getActiveSession", async () => {
//     mockCashSession.findOne.mockResolvedValue({ id: 2, status: "open" });

//     const res = await request(app).get("/api/cash-sessions/active");

//     expect(res.statusCode).toBe(200);
//     expect(res.body.session).toBeDefined();
//     expect(mockCashSession.findOne).toHaveBeenCalledWith(
//       expect.objectContaining({
//         where: expect.objectContaining({ user_id: 1, status: "open" }),
//       }),
//     );
//   });

//   test("POST /cash-sessions/open -> openCashSession", async () => {
//     mockCashSession.findOne.mockResolvedValue(null);
//     mockCashSession.create.mockResolvedValue({
//       id: 3,
//       session_number: "SES1234",
//     });

//     const res = await request(app)
//       .post("/api/cash-sessions/open")
//       .send({ cash_register_id: 1, store_id: 1, opening_amount: 50 });

//     expect(res.statusCode).toBe(201);
//     expect(res.body.success).toBe(true);
//     expect(mockCashSession.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         cash_register_id: 1,
//         user_id: 1,
//         store_id: 1,
//       }),
//     );
//   });

//   test("PUT /cash-sessions/:id/close -> closeCashSession", async () => {
//     const mockSessionInstance = {
//       id: 4,
//       opening_amount: 100,
//       update: jest.fn().mockResolvedValue(true),
//       toJSON: function () {
//         return { id: this.id, opening_amount: this.opening_amount };
//       },
//     };

//     mockCashSession.findOne.mockResolvedValue(mockSessionInstance);
//     mockSalesTransaction.findAll.mockResolvedValue([{ total_sales: 50 }]);

//     const res = await request(app)
//       .put("/api/cash-sessions/4/close")
//       .send({ closing_amount: 160 });

//     expect(res.statusCode).toBe(200);
//     expect(res.body.success).toBe(true);
//     expect(mockSessionInstance.update).toHaveBeenCalled();
//     expect(mockSalesTransaction.findAll).toHaveBeenCalledWith(
//       expect.objectContaining({
//         where: { cash_session_id: "4" }, // note: param type depends on your route parsing
//       }),
//     );
//   });

//   test("GET /cash-sessions/:id -> getSessionById", async () => {
//     mockCashSession.findByPk.mockResolvedValue({
//       id: 5,
//       toJSON: () => ({ id: 5 }),
//     });
//     mockSalesTransaction.findAll.mockResolvedValue([
//       { id: 10, total_amount: 25, sales_items: [{ name: "Item" }] },
//     ]);

//     const res = await request(app).get("/api/cash-sessions/5");

//     expect(res.statusCode).toBe(200);
//     expect(res.body.session).toBeDefined();
//     expect(mockCashSession.findByPk).toHaveBeenCalledWith(
//       "5",
//       expect.any(Object),
//     );
//     expect(mockSalesTransaction.findAll).toHaveBeenCalledWith(
//       expect.objectContaining({
//         where: { cash_session_id: "5" },
//       }),
//     );
//   });

//   test("GET /cash-sessions/store/:store_id/registers -> getRegistersByStore", async () => {
//     mockCashRegister.findAll.mockResolvedValue([
//       { id: 7, name: "Reg 1", total_sessions: 2 },
//     ]);

//     const res = await request(app).get("/api/cash-sessions/store/2/registers");

//     expect(res.statusCode).toBe(200);
//     expect(res.body.registers).toBeDefined();
//     expect(mockCashRegister.findAll).toHaveBeenCalledWith(
//       expect.objectContaining({
//         where: { store_id: "2", is_active: 1 },
//       }),
//     );
//   });
// });
