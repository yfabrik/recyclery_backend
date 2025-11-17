import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { where } from "sequelize";

/** @type {import('../../models/types').DbModels} */
const { CollectionSchedule, CollectionPoint, User, CollectionReceipt } = db;

export const router = Router();

// Générer un numéro de bordereau unique
const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  return `COL-${year}${month}${day}-${timestamp}`;
};

// Obtenir tous les plannings de collecte
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { date_from, date_to, status, employee_id } = req.query;
    const where = {};
    if (date_from && date_to)
      where.scheduled_date = { [Op.between]: [date_from, date_to] };
    if (status) where.status = status;
    if (employee_id) where.employee_id = employee_id;

    const schedules = await CollectionSchedule.findAll({
      include: [{ model: CollectionPoint }, { model: User }],
    });

    res.json({
      success: true,
      schedules,
    });
  })
);

// Obtenir les plannings pour le calendrier
router.get(
  "/calendar",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const where = {};
    if (month && year)
      where = {
        [Op.eq]: [fn("strftime", "%Y-%m", col("scheduled_date")), yearMonth],
      };

    const events = await CollectionSchedule.findAll({
      where,
      include: [{ model: CollectionPoint }, { model: User }],
      order: [["scheduled_date"], ["scheduled_time"]],
    });

    // Transformer les données pour le calendrier
    const calendarEvents = events.map((event) => ({
      id: event.id,
      title: `${event.collection_point_name} - ${
        event.employee_name || "Non assigné"
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
  asyncHandler(async (req, res) => {
    const {
      collection_point_id,
      scheduled_date,
      scheduled_time,
      employee_id,
      vehicle,
      estimated_duration,
      notes,
    } = req.body;

    // Validation
    if (!collection_point_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: "Le point de collecte, la date et l'heure sont requis",
      });
    }

    const point = await CollectionPoint.findByPk(collection_point_id);
    // Vérifier si le point de collecte existe

    if (!point) {
      return res.status(400).json({
        success: false,
        error: "Point de collecte non trouvé",
      });
    }

    // Vérifier la disponibilité de l'employé
    if (employee_id) {
      const conflict = await CollectionSchedule.findOne({
        where: { employee_id, scheduled_date, scheduled_time },
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: "L'employé n'est pas disponible à cette heure",
        });
      }

      await createSchedule();
    } else {
      await createSchedule();
    }

    async function createSchedule() {
      const receiptNumber = generateReceiptNumber();
      const schedule = await CollectionSchedule.create({
        collection_point_id,
        scheduled_date,
        scheduled_time,
        employee_id,
        vehicle,
        estimated_duration,
        notes,
        receipt_number: receiptNumber,
      });

      res.status(201).json({
        success: true,
        message: "Planning de collecte créé avec succès",
        schedule,
      });
    }
  })
);

// Mettre à jour un planning de collecte
router.put(
  "/:id",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      collection_point_id,
      scheduled_date,
      scheduled_time,
      employee_id,
      vehicle,
      estimated_duration,
      notes,
      status,
    } = req.body;

    // Validation
    if (!collection_point_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: "Le point de collecte, la date et l'heure sont requis",
      });
    }

    const schedule = await CollectionSchedule.findByPk(id);
    // Vérifier si le planning existe

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: "Planning non trouvé",
      });
    }
    schedule.collection_point_id ??= collection_point_id;
    schedule.scheduled_date ??= scheduled_date;
    schedule.scheduled_time ??= scheduled_time;
    schedule.employee_id ??= employee_id;
    schedule.vehicle ??= vehicle;
    schedule.estimated_duration ??= estimated_duration;
    schedule.notes ??= notes;
    schedule.status ??= status;
    await schedule.save();

    res.json({
      success: true,
      message: "Planning mis à jour avec succès",
    });
  })
);

// Supprimer un planning de collecte
router.delete(
  "/:id",
  authenticateToken,
  // requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const schedule = await CollectionSchedule.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Planning supprimé avec succès",
    });
  })
);

// Générer un bordereau de collecte
router.post(
  "/:id/receipt",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items_collected, total_weight, notes, signature_data } = req.body;

    // Récupérer les informations du planning
    const schedule = await CollectionSchedule.findByPk(id, {
      include: [{ model: CollectionPoint }, { model: User }],
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: "Planning non trouvé",
      });
    }

    const receipt = await CollectionReceipt.create({
      schedule_id: id,
      receipt_number,
      collection_date: new Date().toISOString(),
      collector_name: schedule.collector_name || "Non assigné",
      collection_point_name: schedule.collection_point_name,
      collection_point_address: `${schedule.collection_point_address}, ${schedule.collection_point_city}`,
      items_collected: JSON.stringify(items_collected || []),
      total_weight,
      notes,
      signature_data,
    });
    // Créer le bordereau

    schedule.status = "completed";
    await schedule.save();
    // Mettre à jour le statut du planning

    res.status(201).json({
      success: true,
      message: "Bordereau créé avec succès",
      receipt,
    });
  })
);

// Obtenir un bordereau de collecte
router.get(
  "/:id/receipt",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const receipt = await CollectionReceipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: "Bordereau non trouvé",
      });
    }

    // Parser les items collectés
    let itemsCollected = [];
    try {
      itemsCollected = JSON.parse(receipt.items_collected || "[]");
    } catch (e) {
      console.error("Erreur lors du parsing des items:", e);
    }

    res.json({
      success: true,
      receipt: {
        ...receipt,
        items_collected: itemsCollected,
      },
    });
  })
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
        [Sequelize.fn("DISTINCT", Sequelize.col("User.id")), "id"],
        "username",
        "email",
        "role",
      ],

      include: [
        {
          model: EmployeeWorkday,
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
        ...(schedule.recyclery_id && { recyclery_id: recycleryId }),
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
      await sequelize.query(
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
          type: sequelize.QueryTypes.SELECT,
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
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "ID employé requis",
      });
    }

    const schedule = await CollectionSchedule.findByPk(scheduleId, {
      include: [{ model: CollectionPoint }],
    });
    // Vérifier que la collecte existe et récupérer ses détails

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

    const employee = await User.findOne({
      include: [
        {
          model: EmployeeWorkday,
          attributes: [],
          required: true, // INNER JOIN
          where: {
            day_of_week: dayOfWeek,
            is_working: 1,
          },
        },
      ],
      where: {
        id: employee_id,
        role: "employee",
        ...(schedule.recyclery_id && { recyclery_id: recycleryId }),
      },

      raw: true,
    });
    // Vérifier que l'employé existe, appartient au bon magasin ET est présent ce jour-là

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employé non trouvé, n'appartient pas à ce magasin ou ne travaille pas le ${dayOfWeek}`,
      });
    }

    // Vérifier si l'employé est déjà assigné à cette collecte
    if (schedule.employee_id === employee_id) {
      return res.status(400).json({
        success: false,
        message: "Cet employé est déjà assigné à cette collecte",
      });
    }

    // Vérifier les conflits d'horaires
    const conflictQuery = await sequelize.query(
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
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const endTime = new Date(
      `${schedule.scheduled_date} ${schedule.scheduled_time}`
    );
    endTime.setHours(endTime.getHours() + 1);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    if (conflicts.length > 0) {
      const conflictDetails = conflicts
        .map(
          (c) =>
            `${c.collection_point_name} (${c.scheduled_time || c.start_time})`
        )
        .join(", ");

      return res.status(400).json({
        success: false,
        message: `L'employé est déjà assigné à d'autres tâches à ce moment : ${conflictDetails}`,
        conflicts: conflicts,
      });
    }

    // Assigner l'employé à la collecte
    schedule.employee_id = employee_id;
    await schedule.save();

    res.json({
      success: true,
      message: "Employé assigné avec succès",
    });
  })
);

// Retirer un employé d'une collecte spécifique
router.delete(
  "/:scheduleId/employees/:employeeId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { scheduleId, employeeId } = req.params;

    // Vérifier que la collecte existe et que l'employé est bien assigné
    const schedule = await CollectionSchedule.findByPk(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Collecte non trouvée",
      });
    }

    if (schedule.employee_id != employeeId) {
      return res.status(400).json({
        success: false,
        message: "Cet employé n'est pas assigné à cette collecte",
      });
    }

    // Retirer l'employé de la collecte
    schedule.employee_id = null;
    await schedule.save();

    res.json({
      success: true,
      message: "Employé retiré avec succès",
    });
  })
);
