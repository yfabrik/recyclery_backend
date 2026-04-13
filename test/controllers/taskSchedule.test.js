import { beforeAll, afterAll, jest, expect } from "@jest/globals";
import db from "../../src/models/index";
import {
  listSchedules,
  findSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getEmployeeSchedule,
  addEmployeeToSchedule,
  removeEmployeeFromSchedule,
  findAvailableEMployee,
  planningStats,
} from "../../src/v1/controllers/taskSchedule";
const {
  TaskSchedule,
  Task,
  User,
  Recyclery,
  EmployeeWorkdays,
  CollectionPoint,
  Employee,
} = db;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  await Recyclery.create({
    name: "Recyclerie Test Orgelet",
    address: "123 Rue de la Recyclerie",
    phone: "+33 1 23 45 67 89",
    email: "recyclery.orgelet@test.com",
    city: "Orgelet",
    postal_code: "39270",
  });
  await Employee.create({
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@test.com",
    phone: "+33 6 12 34 56 78",
    isActive: true,
  });
  await Task.create({
    name: "Nettoyage et tri",
    description: "Nettoyer et trier les arrivages",
    category: "custom",
    priority: "medium",
    estimated_duration: 120,
  });
});

afterAll(async () => {
  // Global teardown handles database cleanup
});

describe("taskSchedule controller functions", () => {
  it("should list schedules", async () => {
    const req = {
      query: {},
      originalUrl: "/api/task-schedules",
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listSchedules(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        schedules: expect.any(Array),
      }),
    );
  });

  it("should list schedules filtered by category", async () => {
    const req = {
      query: { category: "custom" },
      originalUrl: "/api/task-schedules",
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await listSchedules(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        schedules: expect.any(Array),
      }),
    );
  });

  it("should create a schedule", async () => {
    const scheduledDate = new Date("2026-02-10T09:00:00Z");
    const startTime = new Date("2026-02-10T09:00:00Z");
    const endTime = new Date("2026-02-10T17:00:00Z");
    const body = {
      task_id: 1,
      assigned_to: 1,
      store_id: 1,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      category: "custom",
      notes: "Tâche de nettoyage programmée",
      recurrence_pattern: "weekly",
      is_recurring: true,
    };
    const req = {
      body,
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await createSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Planning créé avec succès",
        schedule: expect.objectContaining({
          id: expect.any(Number),
          category: "custom",
        }),
      }),
    );
  });

  it.skip("should find schedule by id", async () => {
    const req = {
      params: { id: 1 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await findSchedule(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        schedule: expect.objectContaining({
          id: 1,
        }),
      }),
    );
  });

  it.skip("should fail to find non-existent schedule", async () => {
    const req = {
      params: { id: 999 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await findSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Planning non trouvé",
      }),
    );
  });

  it("should update a schedule", async () => {
    const scheduledDate = new Date("2026-02-11T09:00:00Z");
    const startTime = new Date("2026-02-11T09:00:00Z");
    const endTime = new Date("2026-02-11T18:00:00Z");
    const req = {
      params: { id: 1 },
      body: {
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        category: "point",
        status: "scheduled",
        notes: "Mise à jour - horaire modifié",
      },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await updateSchedule(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Planning mis à jour avec succès",
      }),
    );
  });

  it("should fail to update non-existent schedule", async () => {
    const req = {
      params: { id: 999 },
      body: {
        status: "completed",
      },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await expect(updateSchedule(req, res)).rejects.toThrow();
  });

  it.skip("should get employee schedule", async () => {
    const req = {
      params: { employee_id: 1 },
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await getEmployeeSchedule(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        schedules: expect.any(Array),
      }),
    );
  });

  it.skip("should get employee schedule filtered by date range", async () => {
    const req = {
      params: { employee_id: 1 },
      query: {
        start_date: "2026-02-01",
        end_date: "2026-02-28",
      },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await getEmployeeSchedule(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        schedules: expect.any(Array),
      }),
    );
  });

  it.skip("should get planning stats", async () => {
    const req = {
      query: {},
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await planningStats(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        stats: expect.objectContaining({
          overview: expect.any(Object),
          topTasks: expect.any(Array),
          topEmployees: expect.any(Array),
        }),
      }),
    );
  });

  it("should delete a schedule", async () => {
    // Create another schedule first
    const scheduledDate = new Date("2026-02-15T09:00:00Z");
    const startTime = new Date("2026-02-15T09:00:00Z");
    const endTime = new Date("2026-02-15T17:00:00Z");
    const createBody = {
      task_id: 1,
      store_id: 1,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      category: "custom",
      notes: "Tâche à supprimer",
    };
    const createReq = {
      body: createBody,
      user: { id: 1, role: "admin" },
    };
    const createRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    await createSchedule(createReq, createRes);
    const createdSchedule = createRes.json.mock.calls[0][0].schedule;

    const req = {
      params: { id: createdSchedule.id },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await deleteSchedule(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Planning supprimé avec succès",
      }),
    );
  });

  it("should fail to delete non-existent schedule", async () => {
    const req = {
      params: { id: 999 },
      user: { id: 1, role: "admin" },
    };

    const res = {
      json: jest.fn(),
    };

    await expect(deleteSchedule(req, res)).rejects.toThrow();
  });
});
