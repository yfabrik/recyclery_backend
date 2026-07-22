import type { RecycleryDto, RecycleryStatsDto } from "@recyclerie/api/responses/recycleries";

import type CashRegister from "../models/cashregister.js";
import type Employee from "../models/employee.js";
import type Recyclery from "../models/recyclery.js";
import type TaskSchedule from "../models/taskschedule.js";
import type User from "../models/user.js";
import { asEmail, asPhone, asPostal } from "./brands.js";
import { toCashRegisterBaseRefDto } from "./cashRegister.js";
import { toEmployeeDto } from "./employees.js";
import { toUserRef } from "./refs.js";
import { toTaskScheduleDto } from "./taskSchedule.js";
import type {  MapperInput } from "./types.js";
import { toIsoDateTime } from "@recyclerie/api";
import { toNumber, toOptionalNumber } from "./serialize.js";

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
  ({
    id: model.id,
    name: model.name,
    address: model.address ,
    phone: asPhone(model.phone),
    email: asEmail(model.email),
    city: model.city,
    postal_code: asPostal(model.postal_code),
    is_active: model.is_active,
    manager_id: model.manager_id ,
    ...(model.cash_registers_count != null
      ? { cash_registers_count: toNumber(model.cash_registers_count) }
      : {}),
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
    manager: toUserRef(model.manager),
    caisses: model.caisses?.map(toCashRegisterBaseRefDto),
    employees: model.employees?.map(toEmployeeDto),
    TaskSchedules: model.TaskSchedules?.map(toTaskScheduleDto),
  }) satisfies RecycleryDto;

export const toRecycleryStatsDto = (stats: {
  items: RecycleryItemStatsRow | null | undefined;
  sales: { monthly_sales: number; monthly_revenue: number };
}): RecycleryStatsDto =>
  ({
    available_items: toOptionalNumber(stats.items?.available_items),
    sold_items: toOptionalNumber(stats.items?.sold_items),
    reserved_items: toOptionalNumber(stats.items?.reserved_items),
    total_items: toOptionalNumber(stats.items?.total_items),
    monthly_sales: stats.sales.monthly_sales,
    monthly_revenue: stats.sales.monthly_revenue,
  }) satisfies RecycleryStatsDto;
