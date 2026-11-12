import type { GiftCardAnalyticsResponse } from "@recyclerie/api/responses/giftCards";
import {
  giftCardFigures,
  loadGiftCardLedger,
} from "../../../services/salesAnalytics/giftCards.js";
import {
  salesAnalyticsRoute,
  type SalesAnalyticsScope,
} from "../../../services/salesAnalytics/index.js";

export const computeGiftCardAnalytics = async (scope: SalesAnalyticsScope) =>
  giftCardFigures(await loadGiftCardLedger(scope.bounds.end), scope);

/** `GET /gift-cards/analytics` */
export const giftCardAnalytics = salesAnalyticsRoute<GiftCardAnalyticsResponse>(
  computeGiftCardAnalytics,
);
