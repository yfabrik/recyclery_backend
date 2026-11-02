import { eachIsoDate } from "@recyclerie/api/domain/date";
import { timeToMinutes } from "@recyclerie/api/domain/timeRange";
import {
  employeeDataSchema,
  employeeSkillsSchema,
} from "@recyclerie/api/schemas/employees";
import { employeeTasksQuerySchema } from "@recyclerie/api/schemas/employeeTasks";
import type { EmployeeTasksResponse } from "@recyclerie/api/responses/employeeTasks";
import type {
  CreateEmployeeResponse,
  DeleteEmployeeResponse,
  DetailEmployeeResponse,
  ListEmployeesResponse,
  UpdateEmployeeResponse,
  UpdateEmployeeSkillsResponse,
} from "@recyclerie/api/responses/employees";
import {
  apiCreated,
  apiData,
  apiMessage,
} from "@recyclerie/api/types/response";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import { classifyEmployeeTask, type HeldRange } from "../../services/employeeTasks.js";
import {
  findEmployeeWorkdaysForDate,
  taskWindow,
} from "../../services/timeRanges.js";
import { toEmployeeDto } from "../../mappers/employees.js";
import { toEmployeeTaskRowDto } from "../../mappers/employeeTasks.js";
import { toTaskDto } from "../../mappers/tasks.js";
import { toTimeRangeDto, toWorkWindowDto } from "../../mappers/timeRanges.js";
import { toEmployeeVacationDto } from "../../mappers/vacations.js";
import { formatWhereDateRange } from "../../helpers.js";
import type { ModelWhere } from "../../models/db-types.ts";
import { endOfDay, startOfDay, toIsoDate } from "../../utils/dates.js";
import type { Request, Response } from "express";
import { Op } from "sequelize";

import db from "../../models/index.js";

const {
  Employee,
  Recyclery,
  EmployeeWorkdays,
  EmployeeVacation,
  EmployeeTaskTimeRange,
  Skill,
  Task,
} = db;

export const listEmployees = async (_req: Request, res: Response) => {
  const rows = await Employee.findAll({
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
      {
        model: EmployeeWorkdays,
      },
    ],
  });

  res.json(
    apiData(rows.map(toEmployeeDto)) satisfies ListEmployeesResponse,
  );
};

export const detailEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const row = await findByPkOrThrow(Employee, id, "employée pas trouvé", {
    include: [
      {
        model: Recyclery,
        as: "stores",
        required: false,
      },
      {
        model: EmployeeWorkdays,
        required: false,
      },
      {
        model: Skill,
        as: "skills",
        required: false,
      },
    ],
  });

  res.json(
    apiData(toEmployeeDto(row)) satisfies DetailEmployeeResponse,
  );
};

export const createEmployee = async (req: Request, res: Response) => {
  const data = employeeDataSchema.parse(req.body);
  const employee = await Employee.create({
    ...data,
  });
  res.status(201).json(
    apiCreated(toEmployeeDto(employee), {
      message: "employee ajouté",
    }) satisfies CreateEmployeeResponse,
  );
};

export const updateEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const data = employeeDataSchema.parse(req.body);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  await employee.update({
    ...data,
    isActive: data.isActive ?? employee.isActive,
  });
  res.json(
    apiData(toEmployeeDto(employee), {
      message: "employee mis à jour",
    }) satisfies UpdateEmployeeResponse,
  );
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  await employee.destroy();
  res.json(
    apiMessage("employee supprimé") satisfies DeleteEmployeeResponse,
  );
};

export const updateEmployeeSkills = async (req: Request, res: Response) => {
  const id = idSchema().parse(req.params.id);
  const employee = await findByPkOrThrow(Employee, id, "employée pas trouvé");
  const data = employeeSkillsSchema.parse(req.body);
  await employee.setSkills(data.skills);
  res.json(
    apiMessage("skills mis a jour") satisfies UpdateEmployeeSkillsResponse,
  );
};

/**
 * Every Task of the range the Employee is on, could be on, or cannot be on,
 * day by day. Ignores any Store filter: Tasks of the Employee's Stores (or of
 * no Store, as the available-employees endpoint offers those to everyone), plus
 * any Task they already hold.
 */
export const listEmployeeTasks = async (req: Request, res: Response) => {
  const employeeId = idSchema().parse(req.params.id);
  const { date_from, date_to } = employeeTasksQuerySchema.parse(req.query);

  const employee = await findByPkOrThrow(Employee, employeeId, "Employé non trouvé", {
    include: [{ model: Recyclery, as: "stores", attributes: ["id"], required: false }],
  });

  const scheduledBetween = formatWhereDateRange(date_from, date_to);
  const heldRanges = await EmployeeTaskTimeRange.findAll({
    where: { EmployeeId: employee.id },
    include: [
      {
        model: Task,
        attributes: [],
        required: true,
        where: { scheduled_date: scheduledBetween } satisfies ModelWhere<typeof Task>,
      },
    ],
  });

  const tasks = await Task.findAll({
    where: {
      scheduled_date: scheduledBetween,
      [Op.or]: [
        { store_id: { [Op.is]: null } },
        { store_id: { [Op.in]: (employee.stores ?? []).map((store) => store.id) } },
        { id: { [Op.in]: heldRanges.map((range) => range.TaskId) } },
      ],
    } satisfies ModelWhere<typeof Task>,
    include: [{ model: Recyclery, required: false }],
  });
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const taskDtoById = new Map(tasks.map((task) => [task.id, toTaskDto(task)]));
  const tasksByDate = Map.groupBy(tasks, (task) => toIsoDate(task.scheduled_date));
  const rangesByTaskId = Map.groupBy(heldRanges, (range) => range.TaskId);
  const rangesByDate = new Map<string, HeldRange[]>();
  for (const range of heldRanges) {
    const task = taskById.get(range.TaskId);
    if (!task) continue;
    const date = toIsoDate(task.scheduled_date);
    rangesByDate.set(date, [
      ...(rangesByDate.get(date) ?? []),
      { taskId: range.TaskId, start: timeToMinutes(range.start_time), end: timeToMinutes(range.end_time) },
    ]);
  }

  const vacations = await EmployeeVacation.findAll({
    where: {
      employee_id: employee.id,
      start_date: { [Op.lte]: endOfDay(date_to).toDate() },
      end_date: { [Op.gte]: startOfDay(date_from).toDate() },
    },
    order: [["start_date", "ASC"]],
  });

  const days = await Promise.all(
    eachIsoDate(date_from, date_to).map(async (date) => {
      const workdays = await findEmployeeWorkdaysForDate(
        EmployeeWorkdays,
        employee.id,
        startOfDay(date).toDate(),
      );
      const workWindows = workdays.map((workday) => ({
        start: timeToMinutes(workday.start_time),
        end: timeToMinutes(workday.end_time),
      }));
      const ranges = rangesByDate.get(date) ?? [];
      // Same day rule as the available-employees endpoint's Vacation filter.
      const vacation = vacations.find(
        (candidate) =>
          candidate.start_date <= endOfDay(date).toDate() &&
          candidate.end_date >= startOfDay(date).toDate(),
      );

      const rows = (tasksByDate.get(date) ?? [])
        .map((task) => ({ task, window: taskWindow(task) }))
        .sort((a, b) => a.window.start - b.window.start || a.window.end - b.window.end || a.task.id - b.task.id)
        .flatMap(({ task, window }) => {
          const taskDto = taskDtoById.get(task.id);
          if (!taskDto) return [];
          const classification = classifyEmployeeTask({ taskId: task.id, task: window, workWindows, ranges });
          const timeRanges = (rangesByTaskId.get(task.id) ?? [])
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
            .map(toTimeRangeDto);
          const blockedBy =
            classification.status === "unavailable" && classification.reason === "busy" && classification.blockedByTaskId !== undefined
              ? taskDtoById.get(classification.blockedByTaskId)
              : undefined;
          return [toEmployeeTaskRowDto(taskDto, timeRanges, classification, blockedBy)];
        });

      return {
        date,
        workWindows: workdays.map(toWorkWindowDto),
        vacation: vacation ? toEmployeeVacationDto(vacation) : null,
        rows,
      };
    }),
  );

  res.json(
    apiData({ employee_id: employee.id, days }) satisfies EmployeeTasksResponse,
  );
};
