import type { Weekday } from "@recyclerie/api/enums";
import type { TaskDto } from "@recyclerie/api/responses/tasks";

import type Employee from "../models/employee.js";
import type Recyclery from "../models/recyclery.js";
import type Task from "../models/task.js";
import { toEmployeeDto } from "./employees.js";
import { toRecycleryRef } from "./refs.js";
import { toIsoDateTime, toNumber } from "./serialize.js";
import type { MapperInput } from "./types.js";

type TaskMapperInput = MapperInput<Task> & {
  day_of_week?: number | null;
  Recyclery?: MapperInput<Recyclery> | null;
  Employees?: Array<MapperInput<Employee>>;
};

export const toTaskDto = (model: TaskMapperInput): TaskDto =>
  ({
    id: model.id,
    name: model.name,
    description: model.description,
    category: model.category,
    priority: (model.priority) as TaskDto["priority"],
    required_skills: model.required_skills,
    location: model.location ,
    equipment_needed: model.equipment_needed ,
    hourly_rate: model.hourly_rate? toNumber(model.hourly_rate):null,
    scheduled_date: toIsoDateTime(model.scheduled_date),
    start_time: toIsoDateTime(model.start_time),
    end_time: toIsoDateTime(model.end_time),
    notes: model.notes ,
    status: model.status ,
    schedule_id: model.schedule_id,
    store_id: model.store_id ,
    collection_point_id: model.collection_point_id ,
    day_of_week: (model.day_of_week) as Weekday | null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    Recyclery: toRecycleryRef(model.Recyclery) ?? null,
    Employees: model.Employees?.map(toEmployeeDto),
  }) satisfies TaskDto;
