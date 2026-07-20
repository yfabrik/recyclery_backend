import type { RecycleryDto, RecycleryStatsDto } from "@recyclerie/api/responses/recycleries";

import type CashRegister from "../models/cashregister.js";
import type Employee from "../models/employee.js";
import type Recyclery from "../models/recyclery.js";
import type TaskSchedule from "../models/taskschedule.js";
import type User from "../models/user.js";
import { asEmail, asPhone, asPostal } from "./brands.js";
import { toCashRegisterDto } from "./cashRegister.js";
import { toEmployeeDto } from "./employees.js";
import { toUserRef } from "./refs.js";
import { toTaskScheduleDto } from "./taskSchedule.js";
import { toIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type RecycleryMapperInput = MapperInput<Recyclery> & {
  manager?: MapperInput<User> | null;
  caisses?: Array<MapperInput<CashRegister>>;
  employees?: Array<MapperInput<Employee>>;
  TaskSchedules?: Array<MapperInput<TaskSchedule>>;
  cash_registers_count?: number | string;
};

export interface RecycleryItemStatsRow {
  available_items?: number | string | null;
  sold_items?: number | string | null;
  reserved_items?: number | string | null;
  total_items?: number | string | null;
}

export const toRecycleryDto = (model: RecycleryMapperInput): RecycleryDto =>
  stripUndefined({
    id: model.id,
    name: model.name,
    address: model.address ?? null,
    phone: asPhone(model.phone),
    email: asEmail(model.email),
    city: model.city ?? null,
    postal_code: asPostal(model.postal_code),
    is_active: model.is_active,
    manager_id: model.manager_id ?? null,
    cash_registers_count: model.cash_registers_count,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    manager: toUserRef(model.manager) ?? null,
    caisses: model.caisses?.map(toCashRegisterDto),
    employees: model.employees?.map(toEmployeeDto),
    TaskSchedules: model.TaskSchedules?.map(toTaskScheduleDto),
  }) satisfies RecycleryDto;

export const toRecycleryStatsDto = (stats: {
  items: RecycleryItemStatsRow | null | undefined;
  sales: { monthly_sales: number; monthly_revenue: number };
}): RecycleryStatsDto =>
  ({
    ...(stats.items ?? {}),
    monthly_sales: stats.sales.monthly_sales,
    monthly_revenue: stats.sales.monthly_revenue,
  }) satisfies RecycleryStatsDto;
