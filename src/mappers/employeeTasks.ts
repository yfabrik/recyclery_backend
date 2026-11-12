import type { EmployeeTaskRowDto } from "@recyclerie/api/responses/employeeTasks";
import type { TaskDto } from "@recyclerie/api/responses/tasks";
import type { WorkWindowDto } from "@recyclerie/api/responses/timeRanges";
import { minutesToTime, type MinuteWindow } from "@recyclerie/api/domain/timeRange";

import type { EmployeeTaskClassification } from "../services/employeeTasks.js";

export const toFreeWindowDto = (window: MinuteWindow): WorkWindowDto => ({
  start_time: minutesToTime(window.start),
  end_time: minutesToTime(window.end),
});

export const toEmployeeTaskRowDto = (
  task: TaskDto,
  timeRanges: EmployeeTaskRowDto["timeRanges"],
  classification: EmployeeTaskClassification,
  blockedBy: TaskDto | undefined,
): EmployeeTaskRowDto =>
  ({
    task,
    status: classification.status,
    timeRanges,
    freeWindows: classification.freeWindows.map(toFreeWindowDto),
    ...(classification.status === "unavailable" && { reason: classification.reason }),
    ...(blockedBy && { blockedBy }),
  }) satisfies EmployeeTaskRowDto;
