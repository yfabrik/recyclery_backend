import z from "zod";
import type { Request, Response } from "express";

import db from "../../models/index.js";

const { Skill } = db;

export const listSkills = async (req: Request, res: Response) => {
  const skills = await Skill.findAll();
  return res.json({ success: true, skills });
};

export const detailSkill = async (req: Request, res: Response) => {
  return res.json({});
};

export const createSkill = async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().trim().nonempty("nom requis"),
    isActive: z.coerce.boolean().default(true),
    description: z.coerce.string().optional(),
  });
  const data = schema.parse(req.body);
  const skill = await Skill.create({ ...data });
  return res.json({ success: true, skill });
};

export const updateSkill = async (req: Request, res: Response) => {
  return res.json({});
};

export const deleteSkill = async (req: Request, res: Response) => {
  return res.json({});
};
