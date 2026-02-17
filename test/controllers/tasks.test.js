import { beforeAll, afterAll, expect, jest } from "@jest/globals";
import db from "../../src/models/index.js";
import { addUserToTask, createTask, detailTask, getUsersFromTask, listTasks, removeUserFromTask } from "../../src/v1/controllers/tasks.js";
const { User } = db

beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    await User.create({ 
        email: "employee@test.com",
        username: "testemployee",
        role: "employee"
    })

})

afterAll(async () => {
  // Global teardown handles database cleanup
})

describe("tasks controller functions", () => {

    it("should create a task", async () => {
        const body = {
            name: "Nettoyage et tri des arrivages",
            description: "Trier et nettoyer les articles reçus ce matin, vérifier leur état",
            category: "custom",
            priority: "medium",
            // estimated_duration: 120,
            // required_skills: ["tri", "nettoyage"],
            location: "Entrepôt principal",
            // equipment_needed: ["Gants", "produits de nettoyage"],
            hourly_rate: 12.50,
            is_recurring: false,
            notes: "Tâche importante pour maintenir la qualité des articles",
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

    it.skip("should add a user to task 1", async () => {
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
    it.skip("should list users for task 1", async () => {

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

    it.skip("should remove user 1 from task 1 ", async () => {
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
