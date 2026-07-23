import type { EmployeeWorkdayDto } from "@recyclerie/api/responses/employeeWorkdays";

import type EmployeeWorkdays from "../models/employeeworkdays.js";
import { toIsoDateTime, toIsoTime } from "../utils/dates.js";
import type {  MapperInput } from "./types.js";
export const toEmployeeWorkdayDto = (
  model: MapperInput<EmployeeWorkdays>,
): EmployeeWorkdayDto =>
  ({
    id: model.id,
    employee_id: model.employee_id,
    day_of_week: model.day_of_week as EmployeeWorkdayDto["day_of_week"],
    time_slot: model.time_slot as EmployeeWorkdayDto["time_slot"],
    is_working: model.is_working,
    start_time: toIsoTime(model.start_time),
    end_time: toIsoTime(model.end_time),
    notes: model.notes,
    week: model.week as EmployeeWorkdayDto["week"],
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies EmployeeWorkdayDto;
