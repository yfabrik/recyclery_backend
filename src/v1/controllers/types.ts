import type { Request } from "express";
import type { Attributes, WhereOptions } from "sequelize";
import type { ModelClass, Models } from "../../models/db-types.js";

export type RequestWithUser = Request & { user: NonNullable<Models["User"]> };

export type ModelWhere<M extends ModelClass> = WhereOptions<Attributes<InstanceType<M>>>