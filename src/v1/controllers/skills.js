import z from "zod";
import db from "../../models/index.js";

const { Skill } = db;
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listSkills = async (req, res) => {
  const skills = await Skill.findAll();
  return res.json({ success: true, skills });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailSkill = async (req, res) => {
  return res.json({});
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createSkill = async (req, res) => {
  const schema = z.object({
    name: z.string().trim().nonempty("nom requis"),
    isActive: z.coerce.boolean().default(true),
    description: z.coerce.string().optional(),
  });
  const data = schema.parse(req.body);
  const skill = await Skill.create({ ...data });
  return res.json({ success: true, skill });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateSkill = async (req, res) => {
  return res.json({});
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteSkill = async (req, res) => {
  return res.json({});
};
