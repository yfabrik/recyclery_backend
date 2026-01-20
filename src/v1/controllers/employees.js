import z, { success } from "zod";
import db from "../../models/index.js";
import { idSchema, phoneSchema } from "../../services/zod.js";
import createHttpError from "http-errors";

const { Employee, Recyclery, EmployeeWorkdays } = db;

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listEmployees = async (req, res) => {
  const data = await Employee.findAll({
    include: [
      {
        model: Recyclery,
        as: "stores",
      },
      { model: EmployeeWorkdays },
    ],
  });

  res.json({
    success: true,
    data,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createEmployee = async (req, res) => {
  const dataSchema = z.object({
    nom: z.string("nom requis").trim().nonempty("nom requis"),
    prenom: z.string("prenom requis").trim().nonempty("prenom requis"),
    isActive: z.coerce.boolean().nullish(),
    email: z.email().nullish(),
    phone: phoneSchema().nullish(),
  });
  const data = dataSchema.parse(req.body);
  const employee = await Employee.create({
    ...data,
  });
  res.status(201).json({
    success: true,
    message: "employee ajouté",
    data: employee,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateEmployee = async (req, res) => {
  const dataSchema = z.object({
    nom: z.string("nom requis").trim().nonempty("nom requis"),
    prenom: z.string("prenom requis").trim().nonempty("prenom requis"),
    isActive: z.coerce.boolean().nullish(),
    email: z.email().nullish(),
    phone: phoneSchema().nullish(),
  });
  const id = idSchema().parse(req.params.id);
  const data = dataSchema.parse(req.body);
  const employee = await Employee.findByPk(id);
  if (!employee) throw new createHttpError.NotFound("employée pas trouvé");
  await employee.update({
    ...data,
  });
  res.json({
    success: true,
    message: "employee mis à jour",
    data: employee,
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteEmployee = async (req, res) => {
  const id = idSchema().parse(req.params.id);
  const employee = await Employee.findByPk(id);
  if (!employee) throw new createHttpError.NotFound("employée pas trouvé");
  await employee.destroy();
  res.json({
    success: true,
    message: "employee supprimé",
  });
};
