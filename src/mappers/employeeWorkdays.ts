import type { EmployeeWorkdayDto } from "@recyclerie/api/responses/employeeWorkdays";

import type EmployeeWorkdays from "../models/employeeworkdays.js";
import { toIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

export const toEmployeeWorkdayDto = (
  model: MapperInput<EmployeeWorkdays>,
): EmployeeWorkdayDto =>
  stripUndefined({
    id: model.id,
    employee_id: model.employee_id,
    day_of_week: model.day_of_week,
    time_slot: model.time_slot,
    is_working: model.is_working,
    start_time: model.start_time,
    end_time: model.end_time,
    notes: model.notes ?? null,
    week: model.week,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
  }) as EmployeeWorkdayDto;
