import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import db from "../../models/index.js";
import logger from "../../services/logger.js";
import {
  createEmployeeWorkdays,
  listEmployeeWorkdays,
} from "../controllers/employeeWorkdays.js";
import { idSchema } from "../../services/zod.js";

const { EmployeeWorkdays, Employee } = db;
export const router = Router();
// Obtenir tous les jours de travail
router.get(
  "/",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in employee workdays route FIXME", {
      query: req.query,
      referer: req?.headers?.referer,
    });

    const workdays = await EmployeeWorkdays.findAll({
      include: [{ model: Employee }],
      order: [
        [Employee, "nom", "ASC"],
        ["day_of_week", "ASC"],
        ["time_slot", "ASC"],
      ],
    });
    res.json({
      success: true,
      workdays,
    });
  }),
);

// Obtenir les jours de travail d'un employé
router.get("/employee/:employeeId", asyncHandler(listEmployeeWorkdays));

// Créer ou mettre à jour les jours de travail d'un employé
router.post("/employee/:employeeId", asyncHandler(createEmployeeWorkdays));

// Créer un jour de travail individuel
router.post(
  "/",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in employee workdays route FIXME", {
      params: req.params,
      body: req.body,
      referer: req?.headers?.referer,
    });

    const {
      employee_id,
      day_of_week,
      time_slot,
      is_working = true,
      start_time,
      end_time,
      notes,
    } = req.body;

    if (!employee_id || day_of_week == null || !time_slot) {
      return res.status(400).json({
        success: false,
        error: "employee_id, day_of_week et time_slot sont requis",
      });
    }

    // Vérifier que l'employé existe
    const employee = await Employee.findByPk(employee_id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employé non trouvé",
      });
    }
    const result = await EmployeeWorkdays.create({
      employee_id,
      day_of_week,
      time_slot,
      is_working: Boolean(is_working),
      start_time,
      end_time,
      notes,
      week: "week1",
    });

    return res.status(201).json({
      success: true,
      message: "Jour de travail créé avec succès",
      workday_id: result.id,
      workday: result,
    });
  }),
);

// Mettre à jour un jour de travail
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in employee workdays route FIXME", {
      params: req.params,
      body: req.body,
      referer: req?.headers?.referer,
    });

    const id = idSchema().parse(req.params.id);
    const { is_working, start_time, end_time, notes } = req.body;

    const result = await EmployeeWorkdays.findByPk(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Jour de travail non trouvé",
      });
    }

      await result.update({
        is_working: Boolean(is_working),
        start_time: start_time || null,
        end_time: end_time || null,
        notes: notes || null,
      });

    return res.json({
      success: true,
      message: "Jour de travail mis à jour avec succès",
      workday: result,
    });
  }),
);

// Supprimer un jour de travail
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in employee workdays route FIXME", {
      params: req.params,
      body: req.body,
      referer: req?.headers?.referer,
    });

    const { id } = req.params;

    const result = await EmployeeWorkdays.destroy({ where: { id } });

    if (result == 0) {
      return res.status(404).json({
        success: false,
        error: "Jour de travail non trouvé",
      });
    }

    return res.json({
      success: true,
      message: "Jour de travail supprimé avec succès",
    });
  }),
);

// Supprimer tous les jours de travail d'un employé
router.delete(
  "/employee/:employeeId",
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in employee workdays route FIXME", {
      params: req.params,
      body: req.body,
      referer: req?.headers?.referer,
    });

    const { employeeId } = req.params;

    const result = await EmployeeWorkdays.destroy({
      where: { employee_id: employeeId },
    });

    res.json({
      success: true,
      message: `${result} jour(s) de travail supprimé(s) avec succès`,
    });
  }),
);
