import { expect, jest } from "@jest/globals";

/**
 * @param {{ body?: object, params?: object, query?: object, user?: object }} [opts]
 */
export function makeReq({ body, params, query, user } = {}) {
  return {
    body: body ?? {},
    params: params ?? {},
    query: query ?? {},
    user: user ?? { id: 1, role: "admin" },
  };
}

export function makeRes() {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
}

/**
 * @param {() => Promise<unknown>} fn
 * @param {number} [status]
 */
export async function expectHttpError(fn, status) {
  await expect(fn).rejects.toMatchObject(
    status != null ? { status } : expect.objectContaining({ status: expect.any(Number) }),
  );
}
