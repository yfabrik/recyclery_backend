import db from "../../src/models/index";

const { Recyclery, User, CollectionPoint, Employee, Category, CashRegister, CashSession } = db;

/**
 * Create a minimal Recyclery for use as FK in tests.
 * @param {Object} [overrides]
 * @returns {Promise<import("../../src/models").Recyclery>}
 */
export async function createRecyclery(overrides = {}) {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return Recyclery.create({
    name: `Test Recyclery ${unique}`,
    address: "123 Test St",
    email: `test_${unique}@recyclery.com`,
    ...overrides,
  });
}

/**
 * Create a minimal User (no manager/recyclery FK required).
 * @param {Object} [overrides]
 * @returns {Promise<import("../../src/models").User>}
 */
export async function createUser(overrides = {}) {
  const base = {
    username: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`,
    password: "password123",
    role: "employee",
    ...overrides,
  };
  return User.create(base);
}

/**
 * Create a minimal CollectionPoint (requires recyclery_id).
 * @param {number} recycleryId
 * @param {Object} [overrides]
 * @returns {Promise<import("../../src/models").CollectionPoint>}
 */
export async function createCollectionPoint(recycleryId, overrides = {}) {
  return CollectionPoint.create({
    name: `Point_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recyclery_id: recycleryId,
    ...overrides,
  });
}

/**
 * Create a minimal Employee (no FK required).
 * @param {Object} [overrides]
 * @returns {Promise<import("../../src/models").Employee>}
 */
export async function createEmployee(overrides = {}) {
  return Employee.create({
    nom: `Dupont${Math.random().toString(36).slice(2, 8)}`,
    prenom: "Jean",
    email: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`,
    isActive: true,
    ...overrides,
  });
}

/**
 * @param {Object} [overrides]
 * @returns {Promise<import("../../src/models").Category>}
 */
export async function createCategory(overrides = {}) {
  const unique = Math.random().toString(36).slice(2, 8);
  return Category.create({
    name: `Category_${unique}`,
    IO: 0,
    ...overrides,
  });
}

/**
 * @param {number} recycleryId
 * @param {Object} [overrides]
 */
export async function createCashRegister(recycleryId, overrides = {}) {
  const unique = Math.random().toString(36).slice(2, 8);
  return CashRegister.create({
    name: `Register_${unique}`,
    recyclery_id: recycleryId,
    is_active: true,
    ...overrides,
  });
}

/**
 * @param {{ registerId: number, userId: number, opening_amount?: number }} opts
 */
export async function createOpenSession({ registerId, userId, opening_amount = 100 }) {
  return CashSession.create({
    cash_register_id: registerId,
    user_id: userId,
    opening_amount,
    status: "open",
  });
}

/**
 * Build a valid createTransaction body.
 * @param {{
 *   sessionId: number,
 *   items: object[],
 *   total_amount_before_promotion?: number,
 *   total_amount?: number,
 *   payment_amount?: number,
 *   payments?: object[],
 *   global_promotion?: number,
 *   global_promotion_type?: "percent" | "fixed",
 * }} opts
 */
export function makeSaleBody({
  sessionId,
  items,
  total_amount_before_promotion,
  total_amount,
  payment_amount,
  payments,
  global_promotion,
  global_promotion_type,
}) {
  const subtotal =
    total_amount_before_promotion ??
    items.reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0);

  let net = total_amount ?? subtotal;
  if (global_promotion != null && global_promotion_type === "percent") {
    net = subtotal * (1 - global_promotion / 100);
  } else if (global_promotion != null && global_promotion_type === "fixed") {
    net = Math.max(subtotal - global_promotion, 0);
  }

  const payAmount = payment_amount ?? net;
  const body = {
    cash_session_id: sessionId,
    total_amount_before_promotion: subtotal,
    total_amount: net,
    payment_amount: payAmount,
    payments: payments ?? [{ method: "cash", amount: payAmount }],
    items,
  };
  if (global_promotion != null) {
    body.global_promotion = global_promotion;
    body.global_promotion_type = global_promotion_type ?? "percent";
  }
  return body;
}
