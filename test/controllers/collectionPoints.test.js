import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { createCollectionPoint, deleteCollectionPoint, detailCollectionPoint, listCollectionPoints } from "../../src/v1/controllers/collectionPoints";
const { User } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ email: "a@example.com" })

})

describe("collection points controller functions", () => {

    it("should create a point", async () => {
        const body = {
            name: "a",
            address: "ailleur",
            city: "orgelet",
            postal_code: "39270",
            // contact_person,
            // contact_phone,
            // contact_email,
            // type,
            // notes,
            // recyclery_id,
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

        await createCollectionPoint(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                collection_point: expect.any(Object),
                success: true
            })
        );
    });

    it("should deny the creation", async () => {
        const body = {
            name: "a",
            address: "ailleur",
            city: "orgelet",
            postal_code: "39270",
            // contact_person,
            // contact_phone,
            // contact_email,
            // type,
            // notes,
            // recyclery_id,
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

        await createCollectionPoint(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false
            })
        );
    });
    it("should find the point id 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await detailCollectionPoint(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                collection_point: expect.any(Object),
                success: true
            })
        );
    });

    it("should list points", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listCollectionPoints(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                collection_points: expect.any(Array),
                success: true
            }))

    });

    it("should delete point 1", async () => {

        const req = {
            params: { id: 1 },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await deleteCollectionPoint(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.any(String),
                success: true
            })
        );
    });



});
