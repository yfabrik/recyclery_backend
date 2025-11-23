import { beforeAll, expect, jest } from "@jest/globals";
import db from "../../src/models";
import { addUserToTask, createTask, detailTask, getUsersFromTask, listTasks, removeUserFromTask } from "../../src/controllers/tasks";
const { User } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ email: "a@example.com" })

})

describe("tasks controller functions", () => {

    it("should create a task", async () => {
        const body = {
            name: "a",
            // description:"b",
            category:1,
            priority:2,
            // estimated_duration,
            // required_skills,
            // location,
            // equipment_needed,
            // hourly_rate,
            // is_recurring,
            // recurrence_pattern,
            // assigned_to,
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

        await createTask(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                task: expect.any(Object),
                success: true
            })
        );
    });
    it("should find the task id 1", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
            params: { id: 1 }
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await detailTask(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                task: expect.any(Object),
                success: true
            })
        );
    });

    it("should list tasks", async () => {

        const req = {
            query: {},
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await listTasks(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                tasks: expect.any(Array),
                success: true
            }))

    });

    it("should add a user to task 1", async () => {
        const body = {
            employee_id: 1
        };
        const req = {
            params: { taskId: 1 },
            // query: { store_id: 1 },
            user: { id: 1, role: "admin" },
            body,
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await addUserToTask(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.any(String),
                success: true
            })
        );
    });
    it("should list users for task 1", async () => {

        const req = {
            params: { taskId: 1 },
            user: { id: 1, role: "admin" },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await getUsersFromTask(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                employees: expect.any(Array),
                success: true
            })
        );
    });

    it("should remove user 1 from task 1 ", async () => {
        const req = {
            params: { taskId: 1, employeeId: 1 },

            user: { id: 1, role: "admin" },

        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await removeUserFromTask(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,

            })
        );
    });


});
