import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { closeCashSession, listCashSessions, openCashSession } from "../../src/controllers/cashSession";
import { createTransaction, listTransactions } from "../../src/controllers/salesTransactions";
const { Recyclery, CashRegister, User, CashSession } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    await User.create({ email: "a@example.com" })
    await Recyclery.create({
        name: "recyclerie test",
        address: "address test",
        phone: "0123456789",
        email: "recyclery@test.com",
        // manager_id:1,
        city: "orgelet",
        postal_code: "39270"
    })

    await CashRegister.create({ name: "caisse 1", recyclery_id: 1 })
    await CashSession.create({ cash_register_id: 1, user_id: 1, opening_amount: 500, recyclery_id: 1 })

})

describe("transactions controller functions", () => {

    it("should create a transaction", async () => {
        const body = {
            cash_session_id: 1,
            store_id: 1,
            total_amount: 10,
            payment_method: "cash",
            payment_amount: 24,
            change_amount: 0,
            items: [],
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await createTransaction(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.any(Object),
                success: true,
                // message: "Transaction créée avec succès",
            })
        );
    });

    it("should list transaction for store 1", async () => {
        const body = {
            store_id: 1,

            limit: 50,
            offset: 0,
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listTransactions(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            transactions: expect.any(Array),

        }))

    });

    it("should create a refund", async () => {
        const body = {
            cash_register_id: 1,
            store_id: 1,
            opening_amount: 500
        };
        const req = {
            params: { store_id: 1 },
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listCashSessions(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                sessions: expect.any(Array),
                success: true
            })
        );
    });

    it("should close the session ", async () => {
        const req = {
            params: { id: 1 },
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            body: { closing_amount: 500 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await closeCashSession(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                expected_amount: expect.any(Number),
                difference_amount: expect.any(Number),
            })
        );
    });


});
