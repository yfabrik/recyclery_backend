import type { Weekday } from "@recyclerie/api/enums";
import type {
  PlanningStatsDto,
  PlanningStatsOverviewDto,
  StoreHoursDto,
  TaskScheduleDto,
  TaskScheduleRefDto,
} from "@recyclerie/api/responses/taskSchedule";

import type Employee from "../models/employee.js";
import type Recyclery from "../models/recyclery.js";
import type Task from "../models/task.js";
import type TaskSchedule from "../models/taskschedule.js";
import { toIsoDateTime, toIsoTime } from "../utils/dates.js";
import { toEmployeeDto } from "./employees.js";
import { toRecycleryRef } from "./refs.js";
import { toNumber, toOptionalNumber, toNumberOrUndefined } from "./serialize.js";
import { toTaskDto } from "./tasks.js";
import type { MapperInput } from "./types.js";

type TaskScheduleMapperInput = MapperInput<TaskSchedule> & {
  day_of_week?: Weekday | number | null;
  Tasks?: Array<MapperInput<Task>>;
  tasks?: Array<MapperInput<Task>>;
  Employees?: Array<MapperInput<Employee>>;
  Recyclery?: MapperInput<Recyclery> | null;
};

export interface PlanningStatsOverviewRow {
  total_schedules?: number | string;
  scheduled_count?: number | string | null;
  in_progress_count?: number | string | null;
  completed_count?: number | string | null;
  cancelled_count?: number | string | null;
}

export const toTaskScheduleDto = (
  model: TaskScheduleMapperInput,
): TaskScheduleDto => {
  const tasks = model.Tasks ?? model.tasks;

  return ({
    id: model.id,
    name: model.name,
    description: model.description ,
    category: model.category,
    priority: (model.priority ) as TaskScheduleDto["priority"],
    required_skills: model.required_skills,
    location: model.location,
    equipment_needed: model.equipment_needed ,
    hourly_rate: model.hourly_rate? toNumber(model.hourly_rate):null,
    is_recurring: model.is_recurring,
    recurrence_pattern: model.recurrence_pattern ,
    scheduled_date: toIsoDateTime(model.scheduled_date),
    start_time: toIsoDateTime(model.start_time),
    end_time: toIsoDateTime(model.end_time),
    notes: model.notes ,
    status: model.status,
    store_id: model.store_id ,
    collection_point_id: model.collection_point_id ,
    day_of_week: (model.day_of_week ?? null) as Weekday | null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    Tasks: tasks?.map(toTaskDto),
    Recyclery: toRecycleryRef(model.Recyclery) ,
    Employees: model.Employees?.map(toEmployeeDto),
  }) satisfies TaskScheduleDto;
};


type TaskScheduleRefInput = MapperInput<TaskSchedule> & {
  day_of_week?: Weekday | number | null;
};

export const toTaskScheduleRef = (
  value: TaskScheduleRefInput,
): TaskScheduleRefDto | undefined => {
  if (typeof value.id !== "number") return undefined;

  return {
    id: value.id,
    name: String(value.name ?? ""),
    is_recurring: value.is_recurring,
    category: value.category,
    scheduled_date: toIsoDateTime(value.scheduled_date),
    start_time: toIsoDateTime(value.start_time),
    end_time: toIsoDateTime(value.end_time),
    day_of_week: (value.day_of_week ?? null) as Weekday | null,
    recurrence_pattern:
      value.recurrence_pattern,
    collection_point_id: value.collection_point_id ,
    store_id: value.store_id,
  } satisfies TaskScheduleRefDto;
};

export const toStoreHoursDto = (
  schedule: TaskScheduleMapperInput,
): StoreHoursDto =>
  ({
    id: schedule.id,
    name: schedule.name ,
    day_of_week: (schedule.day_of_week) as Weekday | null,
    is_open: true,
    open_time: toIsoTime(schedule.start_time),
    close_time: toIsoTime(schedule.end_time),
    is_24h: false,
    notes: schedule.notes ,
    store_id: schedule.store_id ,
    createdAt: toIsoDateTime(schedule.createdAt),
    updatedAt: toIsoDateTime(schedule.updatedAt),
  }) satisfies StoreHoursDto;

export const toPlanningStatsOverviewDto = (
  stats: PlanningStatsOverviewRow | null | undefined,
): PlanningStatsOverviewDto | null => {
  if (stats == null) return null;
  return ({
    total_schedules: toNumberOrUndefined(stats.total_schedules),
    scheduled_count: toOptionalNumber(stats.scheduled_count),
    in_progress_count: toOptionalNumber(stats.in_progress_count),
    completed_count: toOptionalNumber(stats.completed_count),
    cancelled_count: toOptionalNumber(stats.cancelled_count),
  }) satisfies PlanningStatsOverviewDto;
};

export const toPlanningStatsDto = (stats: {
  overview: PlanningStatsOverviewRow | null | undefined;
  topTasks: Array<Record<string, unknown>>;
  topEmployees: Array<Record<string, unknown>>;
}): PlanningStatsDto => ({
  overview: toPlanningStatsOverviewDto(stats.overview),
  topTasks: stats.topTasks,
  topEmployees: stats.topEmployees,
});
