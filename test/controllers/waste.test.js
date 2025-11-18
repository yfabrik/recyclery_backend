import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { createWaste, detailWaste, listWaste } from "../../src/controllers/waste";
const { User, Category } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ email: "a@example.com" })
    await Category.create({ name: "a" })
    await Category.create({ name: "b" })

})

describe("waste controller functions", () => {

    it("should create a waste", async () => {
        const body = {
            disposal_date: new Date(),
            category_id: 1,
            subcategory_id: 2,
            // eco_organism_id,
            disposal_type: "landfill",
            weight_kg: 50,
            // volume_m3,
            // transport_method,
            // transport_company,
            // transport_cost,
            // notes,
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
