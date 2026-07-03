import type { Request, Response } from "express";
import { skillDataSchema } from "@recyclerie/api/schemas/skills";
import type {
  CreateSkillResponse,
  ListSkillsResponse,
} from "@recyclerie/api/responses/skills";
import { apiCreated, apiData } from "@recyclerie/api/types/response";

import db from "../../models/index.js";
import { toSkillDto } from "../../mappers/skills.js";

const { Skill } = db;

export const listSkills = async (_req: Request, res: Response) => {
  const skills = await Skill.findAll();
  return res.json(
    apiData(skills.map(toSkillDto)) satisfies ListSkillsResponse,
  );
};

export const detailSkill = async (_req: Request, res: Response) => {
  return res.json({});
};

export const createSkill = async (req: Request, res: Response) => {
  const data = skillDataSchema.parse(req.body);
  const skill = await Skill.create({ ...data });
  return res.json(
    apiCreated(toSkillDto(skill)) satisfies CreateSkillResponse,
  );
};

export const updateSkill = async (_req: Request, res: Response) => {
  return res.json({});
};

export const deleteSkill = async (_req: Request, res: Response) => {
  return res.json({});
};
