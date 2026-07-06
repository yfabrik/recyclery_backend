import { isHttpError } from "http-errors";
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
} from "sequelize";
import logger from "../services/logger.js";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import type { ErrorRequestHandler } from "express";
import { apiError } from "@recyclerie/api/types/response";
import type { ApiErrorResponse } from "@recyclerie/api/types/response";
const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

type LogLevel = "warn" | "error" | "fatal";

type ResolvedError = {
  status: number;
  level: LogLevel;
  payload: ApiErrorResponse;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "oldpassword",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "secret",
  "pin",
  "otp",
  "code",
]);

/** Recursively redact sensitive fields so request bodies are safe to log. */
const sanitizeBody = (value: unknown, depth = 0): unknown => {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeBody(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) =>
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? [key, "[REDACTED]"]
        : [key, sanitizeBody(val, depth + 1)],
    ),
  );
};

const resolveError = (err: unknown): ResolvedError => {
  // Auth token problems are expected client-side noise, not server faults.
  if (err instanceof JsonWebTokenError || err instanceof NotBeforeError) {
    return { status: 401, level: "warn", payload: apiError("Token invalide") };
  }
  if (err instanceof TokenExpiredError) {
    return { status: 401, level: "warn", payload: apiError("Token expiré") };
  }

  // Sequelize validation errors
  if (err instanceof ValidationError) {
    const details = err.errors.map((e) => ({
      path: e.path || "unknown",
      message: e.message,
      value: e.value ?? null,
      validatorKey: e.validatorKey || null,
      type: e.type || null,
    }));
    const isUniqueValidationError = err.errors.some(
      (e) =>
        e.type === "unique violation"
        || e.validatorKey === "not_unique"
        || /unique/i.test(e.message),
    );

    if (isUniqueValidationError) {
      return {
        status: 409,
        level: "error",
        payload: apiError("Unique constraint violation", {
          error: "Conflict",
          details,
        }),
      };
    }

    return {
      status: 400,
      level: "error",
      payload: apiError("Validation Error", { error: "Bad Request", details }),
    };
  }

  // Unique constraint (duplicate key)
  if (err instanceof UniqueConstraintError) {
    return {
      status: 409,
      level: "warn",
      payload: apiError(err.message, { error: "Conflict" }),
    };
  }

  // Database-level errors are server faults.
  if (err instanceof DatabaseError) {
    return {
      status: 500,
      level: "fatal",
      payload: apiError(err.message, { error: "Database Error" }),
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      level: "warn",
      payload: apiError("validation error", {
        error: err.issues.map((e) => e.message).toString(),
        details: err.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      }),
    };
  }

  if (isHttpError(err)) {
    return {
      status: err.statusCode,
      level: err.statusCode >= 500 ? "fatal" : "warn",
      payload: apiError(err.message, { error: err.message, status: err.status }),
    };
  }

  return { status: 500, level: "fatal", payload: apiError("server error", { status: 500 }) };
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req,
  res,
  _next,
) => {
  const requestWithUser = req as typeof req & {
    user?: { id?: string | number };
  };
  const errorLike = (typeof err === "object" && err !== null ? err : {}) as {
    message?: string;
  };

  const { status, level, payload } = resolveError(err);

  logger.log(level, errorLike.message || "Unhandled error", {
    method: req?.method,
    url: req?.originalUrl,
    status,
    ip: req?.ip,
    "x-forwarded-for": req.headers["x-forwarded-for"],
    userId: requestWithUser.user?.id,
    headers: {
      // Only log non-sensitive headers
      "user-agent": req?.headers?.["user-agent"],
      referer: req?.headers?.referer,
    },
    body: sanitizeBody(req?.body),
    error: err,
  });

  return res.status(status).json(payload);
};
