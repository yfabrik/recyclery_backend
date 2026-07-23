import type { SkillDto } from "@recyclerie/api/responses/skills";

import type Skill from "../models/skill.js";
import { toIsoDateTime } from "./serialize.js";
import type { MapperInput } from "./types.js";

export const toSkillDto = (model: MapperInput<Skill>): SkillDto =>
  ({
    id: model.id,
    name: model.name,
    isActive: model.isActive,
    description: model.description,
    createdAt: toIsoDateTime(model.createdAt),
    updatedAt: toIsoDateTime(model.updatedAt),
  }) satisfies SkillDto;
