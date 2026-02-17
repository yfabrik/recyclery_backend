import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index.js";
import { createWaste, detailWaste, listWaste } from "../../src/v1/controllers/waste.js";
const { User, Category } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ 
        email: "employee@test.com",
        username: "testemployee",
        role: "employee"
    })
    await Category.create({ name: "Déchets électroniques" })
    await Category.create({ name: "Déchets non recyclables", parent_id: 1 })

})

afterAll(async () => {
  // Global teardown handles database cleanup
})

describe("waste controller functions", () => {

    it("should create a waste disposal record", async () => {
        const disposalDate = new Date("2026-01-28T10:00:00Z");
        const body = {
            disposal_date: disposalDate,
            category_id: 1,
            subcategory_id: 2,
            disposal_type: "landfill",
            weight_kg: 125.5,
            volume_m3: 2.5,
            transport_method: "truck",
            transport_company: "Transport Vert",
            transport_cost: 150.00,
            notes: "Déchets non recyclables - envoi vers décharge agréée",
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

        await createWaste(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                disposal_id: expect.any(Number),
                message: expect.any(String)
            })
        );
    });
    it("should find the waste id 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await detailWaste(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                disposal: expect.any(Object),
                // success: true
            })
        );
    });

    it("should list wastes", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listWaste(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                disposals: expect.any(Array),
                pagination: expect.any(Object),
            }))

    });




});
