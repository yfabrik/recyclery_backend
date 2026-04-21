import type { NextFunction, Request, RequestHandler, Response } from "express";

// utils/asyncHandler.js
type AsyncMiddleware<TReq extends Request = Request> = (
  req: TReq,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

export const asyncHandler = <TReq extends Request = Request>(
  fn: AsyncMiddleware<TReq>,
): RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req as TReq, res, next)).catch(next);
