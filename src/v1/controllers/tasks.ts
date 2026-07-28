import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { Op, type Includeable } from "sequelize"; 
import {
  assignEmployeeToTaskBodySchema,
  taskDataSchema,
  taskListFilterSchema,
} from "@recyclerie/api/schemas/tasks";
import type {
  AssignEmployeeTaskResponse,
  CreateTaskResponse,
  DeleteTaskResponse,
  DetailTaskResponse,
  ListTasksResponse,
  RemoveEmployeeTaskResponse,
  TaskEmployeesResponse,
  UpdateTaskResponse,
} from "@recyclerie/api/responses/tasks";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";

import { formatWhereDateRange } from "../../helpers.js";

import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { ModelWhere } from "../../models/db-types.ts";

import db from "../../models/index.js";
import { toEmployeeDto } from "../../mappers/employees.js";
import { toTaskDto } from "../../mappers/tasks.js";

const { Task, TaskSchedule, Employee, Recyclery } = db;

export const listTasks = async (req: Request, res: Response) => {
  const defaultCategory =
    req.originalUrl == "/api/collection-point-presence"
      ? "point"
      : req.originalUrl == "/api/store-hours"
        ? "vente"
        : req.originalUrl == "/api/collections"
          ? "collection"
          : null;
  const data = taskListFilterSchema.parse({
    ...req.query,
    // category: defaultCategory,
  });
  data.category = defaultCategory ?? data.category

  const where: ModelWhere<typeof Task> = {};
  const dateRange = formatWhereDateRange(data.date_from, data.date_to);
  if (dateRange) where.scheduled_date = dateRange;

  if (data.category) where.category = data.category;

  if (data.priority && data.priority !== "all") where.priority = data.priority;

  if (data.search) {
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.like]: data.search } },
        { description: { [Op.like]: data.search } },
      ],
    } satisfies ModelWhere<typeof Task>);
  }
  if (data.store_id) where.store_id = data.store_id;

  const include: Includeable[] = [];
  if (data.include.includes("user"))
    include.push({
      model: Employee,
    });
  if (data.include.includes("store"))
    include.push({
      model: Recyclery,
      required: false,
    });

  const tasks = await Task.findAll({
    include,
    where,
    order: [["createdAt", "DESC"]],
  });

  res.json(
    apiData(tasks.map(toTaskDto)) satisfies ListTasksResponse,
  );
};

export const detailTask = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const tasks = await findByPkOrThrow(Task, id, "Tâche non trouvée");

  // Parser les champs JSON
  // const task = {
  //   ...tasks,
  //   required_skills: tasks?.required_skills
  //     ? JSON.parse(tasks.required_skills)
  //     : [],
  //   equipment_needed: tasks?.equipment_needed
  //     ? JSON.parse(tasks.equipment_needed)
  //     : [],
  // };

  res.json(
    apiData(toTaskDto(tasks)) satisfies DetailTaskResponse,
  );
};

export const createTask = async (req: Request, res: Response) => {
  const data = taskDataSchema.parse(req.body);
  let name = data.name ?? data.category;
  let store;
  if (data.store_id) {
    store = await findByPkOrThrow(Recyclery, data.store_id, "magasin non trouvé");
  }
  if (store && data.category == "custom") {
    name = store.name + "-" + name;
  }

  if (data.recurrence_pattern) {
    const schedule = await db.sequelize.transaction(async (t) => {
      return TaskSchedule.create({ ...data, name }, { transaction: t });
    });
    const [createdTask] = await schedule.getTasks();
    if (!createdTask) {
      throw new createHttpError.InternalServerError("Tâche non créée");
    }

    res.json(
      apiCreated(toTaskDto(createdTask), {
        message: "Tâche créée avec succès",
      }) satisfies CreateTaskResponse,
    );
  } else {
    const { is_recurring, recurrence_pattern, ...rest } = data;
    const task = await Task.create({
      ...rest,
      status: "pending",
      name,
    });

    res.json(
      apiCreated(toTaskDto(task), {
        message: "Tâche créée avec succès",
      }) satisfies CreateTaskResponse,
    );
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const data = taskDataSchema.parse(req.body);
  // Vérifier que la tâche existe
  const existing = await findByPkOrThrow(Task, id, "Tâche non trouvée");

  let name = data.name ?? data.category;

  if (data.store_id && data.category == "custom") {
    const store = await findByPkOrThrow(
      Recyclery,
      data.store_id,
      "magasin non trouvé",
    );
    name = store.name + "-" + name;
  }

  await existing.update({
    ...data,
    name,
  });

  res.json(
    apiData(toTaskDto(existing), {
      message: "Tâche mise à jour avec succès",
    }) satisfies UpdateTaskResponse,
  );
};

export const deleteTask = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);

  const existing = await findByPkOrThrow(Task, id, "Tâche non trouvée");
  await existing.destroy();

  res.json(
    apiMessage("Tâche supprimée avec succès") satisfies DeleteTaskResponse,
  );
};

export const getUsersFromTask = async (req: Request, res: Response) => {
  //TODO use the detail task with query param ?
  const taskId = idSchema().parse(req.params.taskId);

  const tasks = await findByPkOrThrow(Task, taskId, "tache non trouvé", {
    include: [{ model: Employee }],
  });
  res.json(
    apiData(
      (tasks.Employees ?? []).map(toEmployeeDto),
    ) satisfies TaskEmployeesResponse,
  );
};

export const addUserToTask = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const { employee_id } = assignEmployeeToTaskBodySchema.parse(req.body);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");

  const employee = await findByPkOrThrow(
    Employee,
    employee_id,
    "Employé non trouvé",
  );

  //FIXME
  // if (task.hasUser(employee))
  //   return res.status(400).json({
  //     success: false,
  //     message: "Cet employé est déjà assigné à cette tâche",
  //   });

  await task.addEmployee(employee);

  res.json(
    apiMessage("Employé assigné avec succès") satisfies AssignEmployeeTaskResponse,
  );
};

export const removeUserFromTask = async (req: Request, res: Response) => {
  const employeeId = idSchema().parse(req.params.employeeId);
  const taskId = idSchema().parse(req.params.taskId);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");
  await task.removeEmployee(employeeId);

  res.json(
    apiMessage("Employé retiré avec succès") satisfies RemoveEmployeeTaskResponse,
  );
};
