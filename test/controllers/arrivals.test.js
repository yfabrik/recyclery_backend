import { beforeAll, jest } from "@jest/globals";
import db from "../../src/models";

import { createArrival, deleteArrival, detailArrival, listArrivals } from "../../src/v1/controllers/arrivals";
const { Recyclery, Category, User, CollectionPoint } = db

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
    await Category.create({ name: "a" })
    await Category.create({ name: "b" })
    await User.create({ email: "a@example.com" })
    await CollectionPoint.create({
        name: "a",
        address: "ailleur",
        city: "orgelet",
        postal_code: "39270",
    })

})

describe("arrival controller functions", () => {

    it("should create a arrival", async () => {
        const body = {
            category_id: 1,
            subcategory_id: 2,
            weight: 10,
            arrival_date: new Date(),
            arrival_time: new Date(),
            source_type: "a",
            // source_details,
            collection_point_id: 1,
            // collection_point_name,
            // collection_point_address,
            // volunteer_donation,
            // house_clearance,
            // notes
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

        await createArrival(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                arrival: expect.any(Object),
                success: true,

            })
        );
    });

    it("should list arrivals", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
        };

        await listArrivals(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ arrivals: expect.any(Array), success: true })
        );
    });
    it("should find arrival 1", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
        };

        await detailArrival(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ arrival: expect.any(Object), success: true })
        );
    });
    it("should delete arrival 1", async () => {
        const req = {
            query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
        };

        await deleteArrival(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });


});
