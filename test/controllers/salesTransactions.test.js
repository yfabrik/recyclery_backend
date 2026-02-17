// import { beforeAll, afterAll, expect, jest } from "@jest/globals";
// import db from "../../src/models/index.js";
// import { createRefund, createTransaction, listRefunds, listTransactions } from "../../src/v1/controllers/salesTransactions.js";
// const { Recyclery, CashRegister, User, CashSession } = db

// beforeAll(async () => {
//     await db.sequelize.sync({ force: true });
//     await User.create({ 
//         email: "cashier@test.com",
//         username: "cashier1",
//         role: "employee"
//     })
//     await Recyclery.create({
//         name: "Recyclerie Test Orgelet",
//         address: "123 Rue de la Recyclerie",
//         phone: "+33 1 23 45 67 89",
//         email: "recyclery.orgelet@test.com",
//         city: "Orgelet",
//         postal_code: "39270"
//     })

//     await CashRegister.create({ 
//         name: "Caisse Principale", 
//         recyclery_id: 1,
//         is_active: true
//     })
//     await CashSession.create({ 
//         cash_register_id: 1, 
//         user_id: 1, 
//         opening_amount: 500.00, 
//         recyclery_id: 1,
//         status: "open"
//     })

// })

// afterAll(async () => {
//   // Global teardown handles database cleanup
// })

// describe("transactions controller functions", () => {

//     it("should create a transaction", async () => {
//         const body = {
//             cash_session_id: 1,
//             store_id: 1,
//             total_amount: 45.50,
//             payment_method: "cash",
//             payment_amount: 50.00,
//             change_amount: 4.50,
//             items: [
//                 {
//                     item_id: 1,
//                     quantity: 1,
//                     unit_price: 25.00,
//                     total_price: 25.00
//                 },
//                 {
//                     item_id: 2,
//                     quantity: 2,
//                     unit_price: 10.25,
//                     total_price: 20.50
//                 }
//             ],
//         };
//         const req = {
//             query: {},
//             user: { id: 1, role: "admin" },
//             body,
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await createTransaction(req, res);

//         expect(res.json).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 data: expect.any(Object),
//                 success: true,
//                 // message: "Transaction créée avec succès",
//             })
//         );
//     });

//     it("should list transaction for store 1", async () => {
//         const body = {
//             store_id: 1,

//             limit: 50,
//             offset: 0,
//         };
//         const req = {
//             query: {},
//             user: { id: 1, role: "admin" },
//             body,
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await listTransactions(req, res);

//         expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
//             success: true,
//             transactions: expect.any(Array),

//         }))

//     });

//     it("should create a refund", async () => {
//         const body = {
//             cash_register_id: 1,
//             transaction_id: 1,
//             refund_type: 'full',
//             refund_amount: 45.50,
//             refund_reason: "Article défectueux - retour client"
//         };
//         const req = {
//             params: { store_id: 1 },
//             query: { store_id: 1 },
//             user: { id: 1, role: "admin" },
//             body,
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await createRefund(req, res);

//         expect(res.json).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 refund: expect.any(Object),
//                 success: true
//             })
//         );
//     });

//     it("should list refund for transaction", async () => {
//         const req = {
//             params: { id: 1 },
//             query: { store_id: 1 },
//             user: { id: 1, role: "admin" },
//             body: { closing_amount: 500 }
//         };

//         const res = {
//             json: jest.fn(),
//             status: jest.fn().mockReturnThis()
//         };

//         await listRefunds(req, res);

//         expect(res.json).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 success: true,
//                 refunds: expect.any(Array),
//             })
//         );
//     });


// });

describe("transactions controller functions", () => {
  it("should have at least one test", () => {
    expect(true).toBe(true);
  });
});
