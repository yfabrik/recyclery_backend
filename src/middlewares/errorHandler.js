import { isHttpError } from "http-errors";
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
} from "sequelize";
import logger from "../services/logger.js";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
const { JsonWebTokenError, NotBeforeError, TokenExpiredError } = jwt;

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @param {import("express").ErrorRequestHandler} err
 */
export const errorHandler = (err, req, res, next) => {
  logger.error(err?.message || "Unhandled error", {
    method: req?.method,
    url: req?.originalUrl,
    status: err?.status || err?.statusCode || 500,
    ip: req?.ip,
    "x-forwarded-for": req.headers["x-forwarded-for"],
    userId: req?.user?.id,
    headers: {
      // Only log non-sensitive headers
      "user-agent": req?.headers?.["user-agent"],
      referer: req?.headers?.referer,
    },
    err_stack: err,
  });

  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      message: "Token invalide",
    });
  }
  if (err instanceof NotBeforeError) {
    return res.status(401).json({
      success: false,
      message: "Token invalide",
    });
  }

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: "Token expiré",
    });
  }
  // Sequelize Validation Errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      error: err.errors.map((e) => e.message),
    });
  }

  // Unique constraint (duplicate key)
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      success: false,
      error: "Conflict",
      message: err.message,
    });
  }

  // Database-level errors
  if (err instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: "Database Error",
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: err.issues.map((e) => e.message).toString(),
      message: "validation error",
    });
  }

  if (isHttpError(err))
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.message,
      status: err.status,
    });

  return res.status(500).json({
    success: false,
    message: "server error",
    status: 500,
  });
};
