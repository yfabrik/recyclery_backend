import type { TaskDto } from "@recyclerie/api/responses/tasks";

import type Employee from "../models/employee.js";
import type Recyclery from "../models/recyclery.js";
import type Task from "../models/task.js";
import { toEmployeeDto } from "./employees.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type TaskMapperInput = MapperInput<Task> & {
  day_of_week?: string | null;
  Recyclery?: MapperInput<Recyclery> | null;
  Employees?: Array<MapperInput<Employee>>;
};

export const toTaskDto = (model: TaskMapperInput): TaskDto =>
  stripUndefined({
    id: model.id,
    name: model.name,
    description: model.description ?? null,
    category: model.category,
    priority: (model.priority ?? null) as TaskDto["priority"],
    required_skills: model.required_skills ?? null,
    location: model.location ?? null,
    equipment_needed: model.equipment_needed ?? null,
    hourly_rate: model.hourly_rate,
    scheduled_date: toIsoDate(model.scheduled_date),
    start_time: toIsoDate(model.start_time),
    end_time: toIsoDate(model.end_time),
    notes: model.notes ?? null,
    status: model.status ?? null,
    schedule_id: model.schedule_id ?? null,
    store_id: model.store_id ?? null,
    collection_point_id: model.collection_point_id ?? null,
    day_of_week: model.day_of_week ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    Recyclery: toRecycleryRef(model.Recyclery) ?? null,
    Employees: model.Employees?.map(toEmployeeDto),
  }) satisfies TaskDto;
