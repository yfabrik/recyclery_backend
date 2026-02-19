import { Router } from "express";
import z from "zod";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { idSchema } from "../../services/zod.js";
import logger from "../../services/logger.js";
import {
  createEmployeeWorkdays,
  listEmployeeWorkdays,
} from "../controllers/employeeWorkdays.js";

const { EmployeeWorkdays, Employee } = db;
export const router = Router();
// Obtenir tous les jours de travail
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in the router 1");

    const workdays = await EmployeeWorkdays.findAll({
      include: [{ model: Employee }],
      order: [[Employee, "nom"], ["day_of_week"], ["time_slot"]],
    });
    res.json({
      success: true,
      workdays,
    });
  }),
);

// Obtenir les jours de travail d'un employé
router.get(
  "/employee/:employeeId",
  authenticateToken,
  asyncHandler(listEmployeeWorkdays),
);

// Créer ou mettre à jour les jours de travail d'un employé
router.post(
  "/employee/:employeeId",
  authenticateToken,
  asyncHandler(createEmployeeWorkdays),
);

// Créer un jour de travail individuel
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in the router 4");

    const {
      employee_id,
      day_of_week,
      time_slot,
      is_working = true,
      start_time,
      end_time,
      notes,
    } = req.body;

    if (!employee_id || !day_of_week || !time_slot) {
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
      is_working: is_working ? 1 : 0,
      start_time,
      end_time,
      notes,
    });

    res.status(201).json({
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
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in the router 5");

    const { id } = req.params;
    const { is_working, start_time, end_time, notes } = req.body;

    const result = await EmployeeWorkdays.findByPk(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Jour de travail non trouvé",
      });
    }
    ((result.is_working = is_working ? 1 : 0),
      (result.start_time = start_time || null),
      (result.end_time = end_time || null),
      (result.notes = notes || null),
      await result.save());

    res.json({
      success: true,
      message: "Jour de travail mis à jour avec succès",
      workday: result,
    });
  }),
);

// Supprimer un jour de travail
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in the router6 ");

    const { id } = req.params;

    const result = await EmployeeWorkdays.destroy({ where: { id } });

    if (result == 0) {
      return res.status(404).json({
        success: false,
        error: "Jour de travail non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Jour de travail supprimé avec succès",
    });
  }),
);

// Supprimer tous les jours de travail d'un employé
router.delete(
  "/employee/:employeeId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.error("called useless fn in the router 7");

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
