import type {
  AvailableEmployeeDto,
  PlanningStatsDto,
  PlanningStatsOverviewDto,
  StoreHoursDto,
  TaskScheduleDto,
} from "@recyclerie/api/responses/taskSchedule";

import type Employee from "../models/employee.js";
import type Recyclery from "../models/recyclery.js";
import type Task from "../models/task.js";
import type TaskSchedule from "../models/taskschedule.js";
import { toEmployeeDto } from "./employees.js";
import { toRecycleryRef } from "./refs.js";
import { toTaskDto } from "./tasks.js";
import { toIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type TaskScheduleMapperInput = MapperInput<TaskSchedule> & {
  day_of_week?: string | null;
  Tasks?: Array<MapperInput<Task>>;
  tasks?: Array<MapperInput<Task>>;
  Employees?: Array<MapperInput<Employee>>;
  Recyclery?: MapperInput<Recyclery> | null;
};

type AvailableEmployeeInput = MapperInput<Employee> & {
  is_available: boolean;
  has_conflicts: boolean;
  conflicts: Array<MapperInput<Task>>;
  already_assigned?: boolean;
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

  return stripUndefined({
    id: model.id,
    name: model.name,
    description: model.description ?? null,
    category: model.category,
    priority: (model.priority ?? null) as TaskScheduleDto["priority"],
    required_skills: model.required_skills ?? null,
    location: model.location ?? null,
    equipment_needed: model.equipment_needed ?? null,
    hourly_rate: model.hourly_rate,
    is_recurring: model.is_recurring,
    recurrence_pattern: model.recurrence_pattern ?? null,
    scheduled_date: toIsoDate(model.scheduled_date),
    start_time: toIsoDate(model.start_time),
    end_time: toIsoDate(model.end_time),
    notes: model.notes ?? null,
    status: model.status ?? null,
    store_id: model.store_id ?? null,
    collection_point_id: model.collection_point_id ?? null,
    day_of_week: model.day_of_week ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    Tasks: tasks?.map(toTaskDto),
    Recyclery: toRecycleryRef(model.Recyclery) ?? null,
    Employees: model.Employees?.map(toEmployeeDto),
  }) satisfies TaskScheduleDto;
};

export const toStoreHoursDto = (
  schedule: TaskScheduleMapperInput,
): StoreHoursDto =>
  stripUndefined({
    id: schedule.id,
    name: schedule.name,
    day_of_week: schedule.day_of_week ?? null,
    is_open: true,
    open_time: toIsoDate(schedule.start_time),
    close_time: toIsoDate(schedule.end_time),
    is_24h: false,
    notes: schedule.notes ?? "",
    store_id: schedule.store_id ?? null,
    createdAt: toIsoDate(schedule.createdAt),
    updatedAt: toIsoDate(schedule.updatedAt),
  }) satisfies StoreHoursDto;

export const toAvailableEmployeeDto = (
  employee: AvailableEmployeeInput,
): AvailableEmployeeDto => {
  const base = toEmployeeDto(employee);
  return stripUndefined({
    ...base,
    is_available: employee.is_available,
    has_conflicts: employee.has_conflicts,
    conflicts: employee.conflicts.map(toTaskDto),
    already_assigned: Boolean(employee.already_assigned),
  }) satisfies AvailableEmployeeDto;
};

export const toPlanningStatsOverviewDto = (
  stats: PlanningStatsOverviewRow | null | undefined,
): PlanningStatsOverviewDto | null => {
  if (stats == null) return null;
  return stripUndefined({
    total_schedules: stats.total_schedules,
    scheduled_count: stats.scheduled_count,
    in_progress_count: stats.in_progress_count,
    completed_count: stats.completed_count,
    cancelled_count: stats.cancelled_count,
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
