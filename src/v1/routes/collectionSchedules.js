import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { addUserToSchedule, createCollectionSchedule, deleteCollectionSchedule, detailBSD, generateBSD, listcollectionSchedule, removeUserFromSchedule, updateCollectionSchedule } from "../controllers/CollectionSchedule.js";
import { col, fn, Op, QueryTypes } from "sequelize";


const { CollectionSchedule, CollectionPoint, User, EmployeeWorkdays, sequelize } = db;

export const router = Router();

// Obtenir tous les plannings de collecte
router.get(
  "/",
  authenticateToken,
  asyncHandler(listcollectionSchedule)
);
// Obtenir les plannings pour le calendrier
router.get(
  "/calendar",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    /**
* @type {import("sequelize").WhereOptions}
*/
    const where = {};
    if (month && year)
      where[Op.eq] = [fn("strftime", "%Y-%m", col("scheduled_date")), "yearMonth"]

    const events = await CollectionSchedule.findAll({
      where,
      include: [{ model: CollectionPoint }, { model: User }],
      order: [["scheduled_date"], ["scheduled_time"]],
    });

    // Transformer les données pour le calendrier
    const calendarEvents = events.map((event) => ({
      id: event.id,
      title: `${event.collection_point_name} - ${event.employee_name || "Non assigné"
        }`,
      start: `${event.scheduled_date}T${event.scheduled_time}`,
      end: event.estimated_duration
        ? new Date(
          new Date(
            `${event.scheduled_date}T${event.scheduled_time}`
          ).getTime() +
          event.estimated_duration * 60000
        ).toISOString()
        : `${event.scheduled_date}T${event.scheduled_time}`,
      backgroundColor:
        event.status === "completed"
          ? "#4caf50"
          : event.status === "cancelled"
            ? "#f44336"
            : event.status === "in_progress"
              ? "#ff9800"
              : "#2196f3",
      extendedProps: {
        status: event.status,
        collection_point_name: event.collection_point_name,
        employee_name: event.employee_name,
      },
    }));

    res.json({
      success: true,
      events: calendarEvents,
    });
  })
);

// Créer un nouveau planning de collecte
router.post(
  "/",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(createCollectionSchedule)
);

// Mettre à jour un planning de collecte
router.put(
  "/:id",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(updateCollectionSchedule)
);

// Supprimer un planning de collecte
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(deleteCollectionSchedule)
);

// Générer un bordereau de collecte
router.post(
  "/:id/receipt",
  authenticateToken,
  asyncHandler(generateBSD)
);

// Obtenir un bordereau de collecte
router.get(
  "/:id/receipt",
  authenticateToken,
  asyncHandler(detailBSD)
);

// Récupérer les employés disponibles pour une collecte spécifique (en tenant compte des conflits d'horaires et de la présence)
router.get(
  "/:scheduleId/available-employees",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;

    // Récupérer les détails de la collecte
    const schedule = await CollectionSchedule.findByPk(scheduleId, {
      include: [{ model: CollectionPoint }],
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Collecte non trouvée",
      });
    }

    // Déterminer le jour de la semaine de la collecte
    const taskDate = new Date(schedule.scheduled_date);
    const dayOfWeek = taskDate
      .toLocaleDateString("en-US", { weekday: "long" }) //FIXME
      .toLowerCase();

    // Récupérer les employés du magasin ET présents ce jour-là

    const allEmployees = await User.findAll({
      attributes: [
        [fn("DISTINCT", col("User.id")), "id"],
        "username",
        "email",
        "role",
      ],

      include: [
        {
          model: EmployeeWorkdays,
          attributes: [],
          required: true, // INNER JOIN
          where: {
            day_of_week: dayOfWeek,
            is_working: 1,
          },
        },
      ],

      where: {
        role: "employee",
        ...(schedule.recyclery_id && { recyclery_id: schedule.recyclery_id }),
      },

      raw: true,
    });

    // Pour chaque employé, vérifier s'il est disponible
    const availableEmployees = [];
    let processedCount = 0;

    if (allEmployees.length === 0) {
      return res.json({
        success: true,
        employees: [],
        schedule_info: {
          id: schedule.id,
          scheduled_date: schedule.scheduled_date,
          scheduled_time: schedule.scheduled_time,
          collection_point_name: schedule.collection_point_name,
        },
      });
    }

    //FIXME c'est immonde
    allEmployees.forEach(async (employee, index) => {
      // Vérifier les conflits d'horaires pour cet employé
      const conflicts = await sequelize.query(
        `
    SELECT cs.id, cs.scheduled_date, cs.scheduled_time
    FROM collection_schedules cs
    WHERE cs.employee_id = :employeeId
      AND cs.scheduled_date = :scheduledDate
      AND cs.id != :scheduleId
      AND (
        TIME(cs.scheduled_time) BETWEEN TIME(:startTime) AND TIME(DATETIME(:startTime, '+1 hour'))
        OR
        TIME(DATETIME(:startTime, '+1 hour')) BETWEEN TIME(cs.scheduled_time) AND TIME(DATETIME(cs.scheduled_time, '+1 hour'))
      )

    UNION ALL

    SELECT ts.id, ts.scheduled_date, ts.start_time
    FROM task_schedules ts
    INNER JOIN task_schedule_employees tse ON ts.id = tse.schedule_id
    WHERE tse.employee_id = :employeeId
      AND ts.scheduled_date = :scheduledDate
      AND (
        TIME(ts.start_time) BETWEEN TIME(:startTime) AND TIME(DATETIME(:startTime, '+1 hour'))
        OR
        TIME(DATETIME(:startTime, '+1 hour')) BETWEEN TIME(ts.start_time) AND TIME(ts.end_time)
      )
  `,
        {
          replacements: {
            employeeId: employee.id,
            scheduledDate: schedule.scheduled_date,
            scheduleId: schedule.id,
            startTime: schedule.scheduled_time,
          },
          type: QueryTypes.SELECT,
        }
      );
      const endTime = new Date(
        `${schedule.scheduled_date} ${schedule.scheduled_time}`
      );
      endTime.setHours(endTime.getHours() + 1); // Collecte dure 1h par défaut
      const endTimeStr = endTime.toTimeString().slice(0, 5);

      // Vérifier si l'employé est déjà assigné à cette collecte
      const alreadyAssigned = schedule.employee_id === employee.id;

      availableEmployees.push({
        ...employee,
        is_available: conflicts.length === 0 && !alreadyAssigned,
        has_conflicts: conflicts.length > 0,
        conflicts: conflicts,
        already_assigned: alreadyAssigned,
      });

      processedCount++;
      if (processedCount === allEmployees.length) {
        res.json({
          success: true,
          employees: availableEmployees,
          schedule_info: {
            id: schedule.id,
            scheduled_date: schedule.scheduled_date,
            scheduled_time: schedule.scheduled_time,
            collection_point_name: schedule.collection_point_name,
          },
        });
      }
    });
  })
);

// Assigner un employé à une collecte spécifique
router.post(
  "/:scheduleId/employees",
  authenticateToken,
  asyncHandler(addUserToSchedule)
);

// Retirer un employé d'une collecte spécifique
router.delete(
  "/:scheduleId/employees/:employeeId",
  authenticateToken,
  asyncHandler(removeUserFromSchedule)
);
