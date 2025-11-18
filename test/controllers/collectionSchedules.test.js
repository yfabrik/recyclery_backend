import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { addUserToSchedule, createCollectionSchedule, deleteCollectionSchedule, detailBSD, generateBSD, removeUserFromSchedule } from "../../src/controllers/CollectionSchedule";
const { User, CollectionPoint } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ email: "a@example.com" ,role:"employee"})
    await CollectionPoint.create({
        name: "a",
        address: "ailleur",
        city: "orgelet",
        postal_code: "39270",

    });

})

describe("collection schedule controller functions", () => {

    it("should create a schedule", async () => {
        const body = {
            collection_point_id: 1,
            scheduled_date: Date(),
            scheduled_time: Date(),
            // employee_id,
            // vehicle,
            // estimated_duration,
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

        await createCollectionSchedule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                // collection_point: expect.any(Object),
                success: true
            })
        );
    });


    it("should create a bsd for schedule id 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 },
            body: { items_collected: [], total_weight: 10 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await generateBSD(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                receipt: expect.any(Object),
                success: true
            })
        );
    });

    it("should find the bsd for schedule 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await detailBSD(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                receipt: expect.any(Object),
                success: true
            }))

    });
    it("should add user 1 to schedule 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { scheduleId: 1 },
            body: { employee_id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await addUserToSchedule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true
            }))

    });
    it("should fail to add user 1 to schedule 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { scheduleId: 1 },
            body: { employee_id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await addUserToSchedule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false
            }))

    });
    it("should remove user 1 from schedule 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { scheduleId: 1,employee_id: 1 },

        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await removeUserFromSchedule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true
            }))

    });

    it("should delete schedule 1", async () => {

        const req = {
            params: { id: 1 },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await deleteCollectionSchedule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.any(String),
                success: true
            })
        );
    });



});
