import type { Request, Response } from "express";
import type { SalesAnalyticsResponse } from "@recyclerie/api/responses/salesAnalytics";
import {
  salesAnalyticsQuerySchema,
  type SalesAnalyticsQuery,
} from "@recyclerie/api/schemas/salesAnalytics";
import { apiData } from "@recyclerie/api/types/response";
import { comparisonRange, parisDayBounds, type DateRange } from "./ranges.js";
import type { SalesAnalyticsRequest, SalesAnalyticsScope } from "./scope.js";

/**
 * A query schema whose output extends the common query: a route's own
 * `withDateOrder(salesAnalyticsQueryBaseSchema.extend({ ... }))`. Typed by its
 * `parse` only, since the backend and `@recyclerie/api` may resolve two zod
 * copies.
 */
export type SalesAnalyticsQuerySchema<Q extends SalesAnalyticsQuery> = {
  parse: (input: unknown) => Q;
};

/**
 * Parses an analytics query string (400 through `ZodError` when invalid,
 * including `date_from > date_to`) and resolves the comparison range.
 * Pass a route's own schema (built with `withDateOrder`) to accept extra params.
 */
export function parseSalesAnalyticsRequest(rawQuery: unknown): SalesAnalyticsRequest;
export function parseSalesAnalyticsRequest<Q extends SalesAnalyticsQuery>(
  rawQuery: unknown,
  schema: SalesAnalyticsQuerySchema<Q>,
): SalesAnalyticsRequest<Q>;
export function parseSalesAnalyticsRequest(
  rawQuery: unknown,
  schema: SalesAnalyticsQuerySchema<SalesAnalyticsQuery> = salesAnalyticsQuerySchema,
): SalesAnalyticsRequest {
  const query = schema.parse(rawQuery);
  const current: DateRange = { date_from: query.date_from, date_to: query.date_to };
  return {
    query,
    storeId: query.store_id ?? null,
    ranges: {
      current,
      comparison: comparisonRange(current, query.period, query.compare),
    },
  };
}

const scopeFor = (
  request: SalesAnalyticsRequest,
  range: DateRange,
): SalesAnalyticsScope => ({
  range,
  bounds: parisDayBounds(range),
  storeId: request.storeId,
  request,
});

type Handler = (req: Request, res: Response) => Promise<void>;

/**
 * Express handler for an analytics route: parses the query (the common one,
 * or `schema`), runs `compute` once for the current range and once for the
 * comparison range, and answers `{ ranges, current, comparison }`.
 */
export function salesAnalyticsRoute<T>(
  compute: (scope: SalesAnalyticsScope) => Promise<T>,
): Handler;
export function salesAnalyticsRoute<T, Q extends SalesAnalyticsQuery>(
  compute: (scope: SalesAnalyticsScope<Q>) => Promise<T>,
  schema: SalesAnalyticsQuerySchema<Q>,
): Handler;
export function salesAnalyticsRoute<T>(
  compute: (scope: SalesAnalyticsScope) => Promise<T>,
  schema: SalesAnalyticsQuerySchema<SalesAnalyticsQuery> = salesAnalyticsQuerySchema,
): Handler {
  return async (req, res) => {
    const request = parseSalesAnalyticsRequest(req.query, schema);
    const { current, comparison } = request.ranges;
    const [currentFigures, comparisonFigures] = await Promise.all([
      compute(scopeFor(request, current)),
      comparison ? compute(scopeFor(request, comparison)) : null,
    ]);
    res.json(
      apiData({
        ranges: request.ranges,
        current: currentFigures,
        comparison: comparisonFigures,
      }) satisfies SalesAnalyticsResponse<T>,
    );
  };
}
