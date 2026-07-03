import z from "zod";

import type { PaginationMeta } from "@recyclerie/api/types/pagination";

export type { PaginationMeta };

export type PaginationMode =
  | { paginated: false }
  | {
      paginated: true;
      page: number;
      perPage: number;
      limit: number;
      offset: number;
    };

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(200).default(50),
});

const hasQueryValue = (value: unknown) => value !== undefined && value !== "";

export const parsePaginationQuery = (
  query: Record<string, unknown>,
): PaginationMode => {
  const shouldPaginate =
    hasQueryValue(query.page) || hasQueryValue(query.perPage);

  if (!shouldPaginate) {
    return { paginated: false };
  }

  const { page, perPage } = paginationSchema.parse(query);
  return {
    paginated: true,
    page,
    perPage,
    limit: perPage,
    offset: (page - 1) * perPage,
  };
};

export const buildPaginationMeta = (
  page: number,
  perPage: number,
  total: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / perPage);
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};

export const buildUnpaginatedMeta = (total: number): PaginationMeta => ({
  page: 1,
  perPage: total,
  total,
  totalPages: total > 0 ? 1 : 0,
  hasNext: false,
  hasPrevious: false,
});
