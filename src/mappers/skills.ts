import type { SkillDto } from "@recyclerie/api/responses/skills";

import type Skill from "../models/skill.js";
import { toIsoDate } from "./serialize.js";
import type { MapperInput } from "./types.js";

export const toSkillDto = (model: MapperInput<Skill>): SkillDto =>
  ({
    id: model.id,
    name: model.name,
    isActive: model.isActive,
    description: model.description ?? null,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
  }) satisfies SkillDto;
