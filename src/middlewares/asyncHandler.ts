import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { RequestWithUser } from "../v1/controllers/types.js";

// utils/asyncHandler.js
export const asyncHandler = (fn:CallableFunction) => (req:Request|RequestWithUser, res:Response, next:NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
