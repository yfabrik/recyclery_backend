/**
 * The one rule for "is this Employee on Vacation that day": a Vacation covers
 * every Paris day from its first to its last date, both included. Shared by the
 * available-employees list, the employee-tasks endpoint and the assignment
 * guard so the three never disagree.
 *
 * Models are taken as parameters (like `services/timeRanges.ts`) to stay clear
 * of the `models/index` import cycle.
 */
import createHttpError from "http-errors";
import { Op, type ModelStatic, type Transaction, type WhereOptions } from "sequelize";
import { endOfDay, startOfDay } from "../utils/dates.js";
import type EmployeeVacationModel from "../models/employeeVacation.ts";

type DateInput = Parameters<typeof startOfDay>[0];

/** `where` clause on `vacations` rows covering the Paris day of `date`. */
export const vacationCoversDate = (date: DateInput) => ({
  start_date: { [Op.lte]: endOfDay(date).toDate() },
  end_date: { [Op.gte]: startOfDay(date).toDate() },
});

/** Same rule over a loaded Vacation, for callers that already hold the rows. */
export const isVacationOnDate = (
  vacation: Pick<EmployeeVacationModel, "start_date" | "end_date">,
  date: DateInput,
): boolean =>
  vacation.start_date <= endOfDay(date).toDate() &&
  vacation.end_date >= startOfDay(date).toDate();

export function findEmployeeVacationOnDate(
  EmployeeVacation: ModelStatic<EmployeeVacationModel>,
  employeeId: number,
  date: DateInput,
  transaction?: Transaction,
) {
  const where: WhereOptions<EmployeeVacationModel> = {
    employee_id: employeeId,
    ...vacationCoversDate(date),
  };
  return EmployeeVacation.findOne({ where, ...(transaction ? { transaction } : {}) });
}

/**
 * Throws the 409 refusing a new Assignment or Time range for an Employee on
 * Vacation that day. Existing Time ranges are never checked: updating or
 * deleting them stays allowed so a Vacation conflict can be cleared.
 */
export async function assertNotOnVacation(
  EmployeeVacation: ModelStatic<EmployeeVacationModel>,
  employeeId: number,
  date: DateInput,
  transaction?: Transaction,
): Promise<void> {
  const vacation = await findEmployeeVacationOnDate(EmployeeVacation, employeeId, date, transaction);
  if (vacation) {
    throw new createHttpError.Conflict("Cet employé est en congé ce jour-là");
  }
}
