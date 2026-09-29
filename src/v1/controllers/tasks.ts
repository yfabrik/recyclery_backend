import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { Op, type Includeable } from "sequelize";
import {
  assignEmployeeToTaskBodySchema,
  taskDataSchema,
  taskListFilterSchema,
} from "@recyclerie/api/schemas/tasks";
import { timeRangeBodySchema } from "@recyclerie/api/schemas/timeRanges";
import type {
  CreateTaskResponse,
  DeleteTaskResponse,
  DetailTaskResponse,
  ListTasksResponse,
  RemoveEmployeeTaskResponse,
  TaskEmployeesResponse,
  UpdateTaskResponse,
} from "@recyclerie/api/responses/tasks";
import type {
  AssignEmployeeTaskRangeResponse,
  CreateTimeRangeResponse,
  DeleteTimeRangeResponse,
  TaskAvailableEmployeesResponse,
  UpdateTimeRangeResponse,
} from "@recyclerie/api/responses/timeRanges";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import {
  firstFreeWindow,
  minutesToTime,
  timeToMinutes,
  type MinuteWindow,
} from "@recyclerie/api/domain/timeRange";

import { formatWhereDateRange } from "../../helpers.js";

import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import type { ModelWhere } from "../../models/db-types.ts";
import {
  assertValidTimeRange,
  buildTimeRangeContext,
  clampTimeRangesToWindow,
  findEmployeeRangesForDate,
  findEmployeeWorkdaysForDate,
  getBiWeek,
  taskWindow,
} from "../../services/timeRanges.js";
import { endOfDay, startOfDay, weekday } from "../../utils/dates.js";

import db from "../../models/index.js";
import { toTaskAssignedEmployeeDto, toTaskAvailableEmployeeDto, toTimeRangeDto } from "../../mappers/timeRanges.js";
import { toTaskDto } from "../../mappers/tasks.js";

const { Task, TaskSchedule, Employee, EmployeeWorkdays, EmployeeVacation, EmployeeTaskTimeRange, Recyclery } = db;

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
  if (data.include.includes("user"))//TODO rename to employee
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

  await db.sequelize.transaction(async (transaction) => {
    const previousWindow = taskWindow(existing);
    await existing.update({ ...data, name }, { transaction });
    const newWindow = taskWindow(existing);
    if (newWindow.start !== previousWindow.start || newWindow.end !== previousWindow.end) {
      await clampTimeRangesToWindow(EmployeeTaskTimeRange, [existing], newWindow, transaction);
    }
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
  const ranges = await EmployeeTaskTimeRange.findAll({ where: { TaskId: taskId } });
  const rangesByEmployeeId = new Map<number, typeof ranges>();
  for (const range of ranges) {
    const forEmployee = rangesByEmployeeId.get(range.EmployeeId) ?? [];
    forEmployee.push(range);
    rangesByEmployeeId.set(range.EmployeeId, forEmployee);
  }

  res.json(
    apiData(
      (tasks.Employees ?? []).map((employee) =>
        toTaskAssignedEmployeeDto(employee, rangesByEmployeeId.get(employee.id) ?? []),
      ),
    ) satisfies TaskEmployeesResponse,
  );
};

export const addUserToTask = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const { employee_id, start_time, end_time } = assignEmployeeToTaskBodySchema.parse(req.body);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée", {
    include: [{ model: Employee, where: { id: employee_id }, required: false }],
  });
  const employee = await findByPkOrThrow(
    Employee,
    employee_id,
    "Employé non trouvé",
  );

  if (task.Employees && task.Employees.length > 0) {
    throw new createHttpError.Conflict("Cet employé est déjà assigné à cette tâche");
  }

  const range = await db.sequelize.transaction(async (transaction) => {
    const context = await buildTimeRangeContext(
      { EmployeeWorkdays, EmployeeTaskTimeRange, Task },
      { employeeId: employee.id, task, transaction },
    );

    let window: MinuteWindow;
    if (start_time !== undefined && end_time !== undefined) {
      window = { start: timeToMinutes(start_time), end: timeToMinutes(end_time) };
      assertValidTimeRange(window, context);
    } else {
      const free = firstFreeWindow(context);
      if (!free) {
        throw new createHttpError.Conflict(
          "Aucune plage horaire disponible pour cet employé sur cette tâche",
        );
      }
      window = free;
    }

    await task.addEmployee(employee, { transaction });
    return EmployeeTaskTimeRange.create(
      {
        EmployeeId: employee.id,
        TaskId: task.id,
        start_time: minutesToTime(window.start),
        end_time: minutesToTime(window.end),
      },
      { transaction },
    );
  });

  res.json(
    apiCreated(toTimeRangeDto(range), {
      message: "Employé assigné avec succès",
    }) satisfies AssignEmployeeTaskRangeResponse,
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

export const getAvailableEmployeesForTask = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");

  const start = startOfDay(task.scheduled_date).toDate();
  const end = endOfDay(task.scheduled_date).toDate();

  const workdayInclude = {
    model: EmployeeWorkdays,
    attributes: [],
    required: true,
    where: {
      day_of_week: weekday(task.scheduled_date),
      is_working: true,
      week: getBiWeek(task.scheduled_date),
    },
  };

  // LEFT JOIN vacations covering the day, then keep rows with no match
  const vacationExcludeInclude = {
    model: EmployeeVacation,
    as: "vacations",
    attributes: [],
    required: false,
    where: {
      start_date: { [Op.lte]: end },
      end_date: { [Op.gte]: start },
    },
  };

  const include: Includeable[] = [workdayInclude, vacationExcludeInclude];
  if (task.store_id) {
    include.push({
      model: Recyclery,
      as: "stores",
      where: { id: task.store_id },
      required: true,
    });
  }

  const candidates = await Employee.findAll({
    subQuery: false,
    where: { "$vacations.id$": { [Op.is]: null } },
    include,
  });

  const employees = await Promise.all(
    candidates.map(async (employee) => {
      const [workdays, busyRanges] = await Promise.all([
        findEmployeeWorkdaysForDate(EmployeeWorkdays, employee.id, task.scheduled_date),
        findEmployeeRangesForDate(EmployeeTaskTimeRange, Task, employee.id, task.scheduled_date, {
          excludeTaskId: task.id,
        }),
      ]);
      return toTaskAvailableEmployeeDto(employee, workdays, busyRanges);
    }),
  );

  res.json(apiData(employees) satisfies TaskAvailableEmployeesResponse);
};

export const createTimeRange = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const employeeId = idSchema().parse(req.params.employeeId);
  const { start_time, end_time } = timeRangeBodySchema.parse(req.body);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée", {
    include: [{ model: Employee, where: { id: employeeId }, required: false }],
  });
  if (!task.Employees || task.Employees.length === 0) {
    throw new createHttpError.NotFound("Assignation non trouvée");
  }

  const range = await db.sequelize.transaction(async (transaction) => {
    const context = await buildTimeRangeContext(
      { EmployeeWorkdays, EmployeeTaskTimeRange, Task },
      { employeeId, task, transaction },
    );
    const window: MinuteWindow = { start: timeToMinutes(start_time), end: timeToMinutes(end_time) };
    assertValidTimeRange(window, context);
    return EmployeeTaskTimeRange.create(
      { EmployeeId: employeeId, TaskId: taskId, start_time, end_time },
      { transaction },
    );
  });

  res.json(apiCreated(toTimeRangeDto(range)) satisfies CreateTimeRangeResponse);
};

export const updateTimeRange = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const employeeId = idSchema().parse(req.params.employeeId);
  const rangeId = idSchema().parse(req.params.rangeId);
  const { start_time, end_time } = timeRangeBodySchema.parse(req.body);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");

  const updated = await db.sequelize.transaction(async (transaction) => {
    const range = await EmployeeTaskTimeRange.findOne({
      where: { id: rangeId, TaskId: taskId, EmployeeId: employeeId },
      transaction,
    });
    if (!range) throw new createHttpError.NotFound("Plage horaire non trouvée");

    const context = await buildTimeRangeContext(
      { EmployeeWorkdays, EmployeeTaskTimeRange, Task },
      { employeeId, task, excludeRangeId: rangeId, transaction },
    );
    const window: MinuteWindow = { start: timeToMinutes(start_time), end: timeToMinutes(end_time) };
    assertValidTimeRange(window, context);
    await range.update({ start_time, end_time }, { transaction });
    return range;
  });

  res.json(apiData(toTimeRangeDto(updated)) satisfies UpdateTimeRangeResponse);
};

export const deleteTimeRange = async (req: Request, res: Response) => {
  const taskId = idSchema().parse(req.params.taskId);
  const employeeId = idSchema().parse(req.params.employeeId);
  const rangeId = idSchema().parse(req.params.rangeId);

  const task = await findByPkOrThrow(Task, taskId, "Tâche non trouvée");

  await db.sequelize.transaction(async (transaction) => {
    const range = await EmployeeTaskTimeRange.findOne({
      where: { id: rangeId, TaskId: taskId, EmployeeId: employeeId },
      transaction,
    });
    if (!range) throw new createHttpError.NotFound("Plage horaire non trouvée");

    await range.destroy({ transaction });

    const remaining = await EmployeeTaskTimeRange.count({
      where: { TaskId: taskId, EmployeeId: employeeId },
      transaction,
    });
    if (remaining === 0) {
      await task.removeEmployee(employeeId, { transaction });
    }
  });

  res.json(
    apiMessage("Plage horaire supprimée avec succès") satisfies DeleteTimeRangeResponse,
  );
};
