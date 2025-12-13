import { beforeAll, jest } from "@jest/globals";
import db from "../../src/models";
import { createCaisse, deleteCaisse, detailCaisse, listCaisses } from "../../src/v1/controllers/cashRegister";
const { Recyclery } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    await Recyclery.create({
        name: "recyclerie test",
        address: "address test",
        phone: "0123456789",
        email: "recyclery@test.com",
        // manager_id,
        city: "orgelet",
        postal_code: "39270"

    })
})

describe("caisses controller functions", () => {

    it("should create a caisse for recyclerie 1", async () => {
        const body = {
            name: "caisse 1",
            store_id: 1
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

        await createCaisse(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.any(Object),
                success: true,
                message: "Caisse créée avec succès",
            })
        );
    });
    it("should find the caisse 1", async () => {
        const body = {
            name: "caisse 1",
            store_id: 1
        };
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await detailCaisse(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.any(Object),
                success: true,
            })
        );
    });

    it("should list caisse for recyclerie 1", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
        };

        await listCaisses(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.any(Array) })
        );
    });

    it("should delete caisse 1", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
        };

        await deleteCaisse(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Caisse supprimée avec succès",
            })
        );
    });
});
