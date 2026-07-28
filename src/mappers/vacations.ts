import type { IsoDate } from "@recyclerie/api";
import type { EmployeeVacationDto } from "@recyclerie/api/responses/vacations";

import type EmployeeVacation from "../models/employeeVacation.js";
import { toIsoDate, toIsoDateTime } from "../utils/dates.js";
import type { MapperInput } from "./types.js";

export const toEmployeeVacationDto = (
  model: MapperInput<EmployeeVacation>,
): EmployeeVacationDto =>
  ({
    id: model.id,
    employee_id: model.employee_id,
    start_date: toIsoDate(model.start_date) as IsoDate,
    end_date: toIsoDate(model.end_date) as IsoDate,
    reason: model.reason,
    notes: model.notes ?? null,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies EmployeeVacationDto;
