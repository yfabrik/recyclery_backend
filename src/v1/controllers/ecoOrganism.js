import { col, fn, literal, Op } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";
import z, { optional } from "zod";
import logger from "../../services/logger.js";
import {
  asOptionalStringWithoutEmpty,
  idSchema,
  nullishToNull,
  phoneSchema,
} from "../../services/zod.js";

const { EcoOrganism, WasteDisposal } = db;

const dataSchema = z.object({
  name: z.string().trim().nonempty("Le nom est requis"),
  description: z.string().nullish(),
  contact_email: z.email().nullish(),
  contact_phone: phoneSchema().nullish(),
  address: z.string().nullish(),
  website: z.url().nullish(),
  is_active: z.boolean().optional().default(true),
});

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listEcoOrganism = async (req, res) => {
  const ALLOWED_INCLUDES = ["waste"];
  const filterSchema = z.object({
    active: z.coerce.boolean().optional(),
    include: z
      .string()
      .toLowerCase()
      .optional()
      .transform((val) => (val ? val.split(",") : []))
      .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
  });
  const filter = filterSchema.parse(req.query);
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};
  if (filter.active) where.is_active = filter.active;
  const include = [];
  if (filter.include.includes("waste")) include.push({ model: WasteDisposal });

  const eco_organisms = await EcoOrganism.findAll({ where, include });

  res.json({ eco_organisms });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listActiveEcoOrganism = async (req, res) => {
  logger.warn("use list active eco organise TO REMOVE");
  req.query.active = "true";
  return listEcoOrganism(req, res);
  // const eco_organisms = await EcoOrganism.findAll({ where: { is_active } });

  // res.json({ eco_organisms });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailEcoOrganism = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const eco_organism = await EcoOrganism.findByPk(id);

  if (!eco_organism) throw new createHttpError[404]("Éco-organisme non trouvé");

  res.json({ eco_organism });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createEcoOrganism = async (req, res) => {
  const data = dataSchema.parse(req.body);

  const created = await EcoOrganism.create({
    ...data,
  });

  res.status(201).json({
    message: "Éco-organisme créé avec succès",
    eco_organism_id: created.id,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateEcoOrganism = async (req, res) => {
  const id = idSchema().parse(req.params.id);

  const data = dataSchema.parse(req.body);

  const eco_organism = await EcoOrganism.findByPk(id);
  if (!eco_organism) throw new createHttpError[404]("eco organisme pas trouvé");
  await eco_organism.update({
    ...data,
  });

  res.json({ message: "Éco-organisme mis à jour avec succès", eco_organism });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteEcoOrganism = async (req, res) => {
  const { id } = req.params;

  const waste = await WasteDisposal.count({ where: { eco_organism_id: id } });
  // Check if eco-organism is used in waste disposals

  if (waste > 0) {
    // If used in waste disposals, deactivate instead of delete
    await EcoOrganism.update({ is_active: false }, { where: { id } });

    res.json({ message: "Éco-organisme désactivé avec succès" });
  } else {
    const deleted = await EcoOrganism.destroy({ where: { id } });
    // If not used, delete permanently

    if (deleted === 0) {
      return res.status(404).json({ error: "Éco-organisme non trouvé" });
    }
    res.json({ message: "Éco-organisme supprimé avec succès" });
  }
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const ecoOrgaStats = async (req, res) => {
  const stats = await EcoOrganism.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_eco_organisms"],
      [
        fn("SUM", literal(`CASE WHEN "is_active" = 1 THEN 1 ELSE 0 END`)),
        "active_eco_organisms",
      ],
      [
        fn("SUM", literal(`CASE WHEN "is_active" = 0 THEN 1 ELSE 0 END`)),
        "inactive_eco_organisms",
      ],
    ],
  });

  res.json({ stats });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const ecoOrgQuarterStats = async (req, res) => {
  const quartersMonth = [0, 3, 6, 9];
  var today = new Date();
  var quarter = Math.floor((today.getMonth() + 3) / 3);

  const startQuarter = new Date(
    new Date().setMonth(quartersMonth[quarter - 1], 1),
  );

  const dates = [today, new Date(startQuarter)];
  for (let index = 1; index < 4; index++) {
    const tmp = new Date(startQuarter);
    tmp.setMonth(tmp.getMonth() - index * 3);
    dates.push(tmp);
  }

  const quarterCurrent = await EcoOrganism.findAll({
    include: [
      {
        model: WasteDisposal,
        where: { createdAt: { [Op.between]: [dates[1], dates[0]] } },
        required:true
      },
    ],
  });

  const quarter1 = await EcoOrganism.findAll({
    include: [
      {
        model: WasteDisposal,
        where: { createdAt: { [Op.between]: [dates[2], dates[1]] } },
        required: true,
      },
    ],
  });

  const quarter2 = await EcoOrganism.findAll({
    include: [
      {
        model: WasteDisposal,
        where: { createdAt: { [Op.between]: [dates[3], dates[2]] } },
        required: true,
      },
    ],
  });

  const quarter3 = await EcoOrganism.findAll({
    include: [
      {
        model: WasteDisposal,
        where: { createdAt: { [Op.between]: [dates[4], dates[3]] } },
        required: true,
      },
    ],
  });
  const a= [quarterCurrent,quarter1,quarter2,quarter3].reduce((prev,current)=>{
    const weight = current.WasteDisposals?.reduce((p,c)=>p+=c.weight_kg,0)
    if(prev[current.name])
      prev[current.name].weight+=weight
    else{
      prev[current.name]={...current,weight:weight}
    }
    return prev
  },{})

  res.status(200).json(a);

};
