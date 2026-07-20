import type {
  DashboardActivityDto,
  DashboardChartsDto,
  DashboardStatsDto,
  DashboardStoreDto,
  DashboardStoreHistoryDto,
  DashboardStoreMonthStatsDto,
  DashboardStorePeriodStatsDto,
  DashboardStoreStatsBlockDto,
} from "@recyclerie/api/responses/dashboard";

import { toIsoDate } from "./serialize.js";
import { asEmail, asPhone } from "./brands.js";

export const toDashboardStatsDto = (stats: DashboardStatsDto): DashboardStatsDto =>
  stats;

export const toDashboardActivityDto = (
  activity: DashboardActivityDto,
): DashboardActivityDto => activity;

export const toDashboardChartsDto = (
  charts: DashboardChartsDto,
): DashboardChartsDto => charts;

const toPeriodStats = (period: {
  transactions: number;
  revenue: number;
  start: Date;
  end: Date;
}): DashboardStorePeriodStatsDto =>
  ({
    transactions: period.transactions,
    revenue: period.revenue,
    start: toIsoDate(period.start),
    end: toIsoDate(period.end),
  }) satisfies DashboardStorePeriodStatsDto;

const toMonthStats = (month: {
  transactions: number;
  revenue: number;
  averageTransaction: number;
  sessions: number;
  start: Date;
  end: Date;
}): DashboardStoreMonthStatsDto =>
  ({
    transactions: month.transactions,
    revenue: month.revenue,
    averageTransaction: month.averageTransaction,
    sessions: month.sessions,
    start: toIsoDate(month.start),
    end: toIsoDate(month.end),
  }) satisfies DashboardStoreMonthStatsDto;

export const toDashboardStoreStatsBlockDto = (
  stats: {
    currentMonth: {
      transactions: number;
      revenue: number;
      averageTransaction: number;
      sessions: number;
      start: Date;
      end: Date;
    };
    lastMonth: {
      transactions: number;
      revenue: number;
      start: Date;
      end: Date;
    };
    items: { available: number; sold: number };
    growth: { revenue: number };
  },
): DashboardStoreStatsBlockDto =>
  ({
    currentMonth: toMonthStats(stats.currentMonth),
    lastMonth: toPeriodStats(stats.lastMonth),
    items: stats.items,
    growth: stats.growth,
  }) satisfies DashboardStoreStatsBlockDto;

export const toDashboardStoreDto = (store: {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  stats: Parameters<typeof toDashboardStoreStatsBlockDto>[0];
}): DashboardStoreDto =>
  ({
    id: store.id,
    name: store.name,
    address: store.address ?? null,
    phone: asPhone(store.phone),
    email: asEmail(store.email),
    stats: toDashboardStoreStatsBlockDto(store.stats),
  }) satisfies DashboardStoreDto;

export const toDashboardStoreHistoryDto = (store: {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  stats: Parameters<typeof toDashboardStoreStatsBlockDto>[0][];
}): DashboardStoreHistoryDto =>
  ({
    id: store.id,
    name: store.name,
    address: store.address ?? null,
    phone: asPhone(store.phone),
    email: asEmail(store.email),
    stats: store.stats.map(toDashboardStoreStatsBlockDto),
  }) satisfies DashboardStoreHistoryDto;
