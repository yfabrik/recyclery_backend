import type {
  TaskAvailableEmployeeDto,
  TimeRangeDto,
  WorkWindowDto,
} from "@recyclerie/api/responses/timeRanges";
import type { TaskAssignedEmployeeDto } from "@recyclerie/api/responses/tasks";

import type Employee from "../models/employee.js";
import type EmployeeTaskTimeRange from "../models/employeetasktimerange.js";
import type EmployeeWorkdays from "../models/employeeworkdays.js";
import { toIsoDateTime, toIsoTime } from "../utils/dates.js";
import { toEmployeeDto } from "./employees.js";
import type { MapperInput } from "./types.js";

export const toTimeRangeDto = (
  model: MapperInput<EmployeeTaskTimeRange>,
): TimeRangeDto =>
  ({
    id: model.id,
    employee_id: model.EmployeeId,
    task_id: model.TaskId,
    start_time: toIsoTime(model.start_time),
    end_time: toIsoTime(model.end_time),
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies TimeRangeDto;

export const toWorkWindowDto = (
  model: MapperInput<EmployeeWorkdays>,
): WorkWindowDto => ({
  start_time: toIsoTime(model.start_time),
  end_time: toIsoTime(model.end_time),
});

export const toTaskAvailableEmployeeDto = (
  employee: MapperInput<Employee>,
  workdays: Array<MapperInput<EmployeeWorkdays>>,
  busyRanges: Array<MapperInput<EmployeeTaskTimeRange>>,
): TaskAvailableEmployeeDto =>
  ({
    ...toEmployeeDto(employee),
    workWindows: workdays.map(toWorkWindowDto),
    busyRanges: busyRanges.map(toTimeRangeDto),
  }) satisfies TaskAvailableEmployeeDto;

export const toTaskAssignedEmployeeDto = (
  employee: MapperInput<Employee>,
  timeRanges: Array<MapperInput<EmployeeTaskTimeRange>>,
): TaskAssignedEmployeeDto =>
  ({
    ...toEmployeeDto(employee),
    timeRanges: timeRanges.map(toTimeRangeDto),
  }) satisfies TaskAssignedEmployeeDto;
