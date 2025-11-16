import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { closeCashSession, listCashSessions, openCashSession } from "../../src/controllers/cashSession";
const { Recyclery, CashRegister,User } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    await User.create({email:"a@example.com"})
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


})

describe("caisseSessions controller functions", () => {

    it("should create a session for caisse 1", async () => {
        const body = {
            cash_register_id: 1,
            store_id: 1,
            opening_amount: 500
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

        await openCashSession(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                session: expect.any(Object),
                success: true
            })
        );
    });

    it("should deny a session for caisse 1", async () => {
        const body = {
            cash_register_id: 1,
            store_id: 1,
            opening_amount: 500
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

        await openCashSession(req, res);

        expect(res.status).toHaveBeenCalledWith(400)

    });

    it("should list open sessions for caisse 1", async () => {
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
