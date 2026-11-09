/**
 * Shared definitions of the sales analytics routes: Sale vs Refund,
 * Paris-time ranges, Store scope, comparison range, line value and category
 * roll-up, and the `{ ranges, current, comparison }` envelope. SQL only
 * filters; loaders return plain rows and the helpers aggregate them in JS.
 */
export * from "./categories.js";
export * from "./handler.js";
export * from "./lines.js";
export * from "./ranges.js";
export * from "./scope.js";
export * from "./transactions.js";
