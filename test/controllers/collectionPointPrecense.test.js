import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { createPointPrecense, deletePointPrecense, detailPointPrecense, listPointPrecense } from "../../src/controllers/collectionPointPrecense";
const { User, CollectionPoint, Recyclery } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ email: "a@example.com", role: "employee" })
    await Recyclery.create({
        name: "recyclerie test",
        address: "address test",
        phone: "0123456789",
        email: "recyclery@test.com",
        // manager_id:1,
        city: "orgelet",
        postal_code: "39270"
    })
    await CollectionPoint.create({
        name: "a",
        address: "ailleur",
        city: "orgelet",
        postal_code: "39270",

    });

})

describe("collection schedule controller functions", () => {

    it("should create a point precense", async () => {
        const body = {
            collection_point_id: 1,
            store_id: 1,
            day_of_week: 1,
            time_slot_name: "a",
            is_present: true,
            start_time: 9,
            end_time:12,

        }
        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await createPointPrecense(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true
            })
        );
    });


    it("should list point precense", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },

        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listPointPrecense(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                presence_hours: expect.any(Array),
                success: true
            })
        );
    });

    it("should find the point precense 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await detailPointPrecense(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                presence_hours: expect.any(Object),
                success: true
            }))

    });
    it("should remove point precense 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await deletePointPrecense(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true
            }))

    });
   


});
