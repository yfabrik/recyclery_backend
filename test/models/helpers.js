import db from "../../src/models/index";

const { Recyclery, User, CollectionPoint, Employee } = db;

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
