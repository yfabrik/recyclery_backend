import logger from "./logger.js";

export type AuditService = "arrivals" | "sales" | "refunds";

export const logAction = (
  service: AuditService,
  event: string,
  meta: Record<string, unknown> = {},
) => {
  logger.info(event, { service, event, ...meta });
};
