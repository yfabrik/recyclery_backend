import createHttpError from "http-errors";
import { col, fn, literal, Op } from "sequelize";
import * as z from "zod";
import db from "../../models/index.js";
import { idSchema } from "../../services/zod.js";

const {
  TaskSchedule,
  Task,
  User,
  Recyclery,
  EmployeeWorkdays,
  CollectionPoint,
  Employee,
} = db;

const dataSchema = z.object({
  scheduled_date: z.coerce.date("date requis"),
  start_time: z.coerce.date("heure de debut requis"),
  end_time: z.coerce.date("heure de fin requis"),
  category: z.enum(["vente", "point", "collection", "custom"]),
  notes: z.string().optional(),
  store_id: idSchema().optional(),
  collection_point_id: idSchema().optional(),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly"]).optional(),
  is_recurring: z.coerce.boolean().default(true),
  name: z.string().nullish(),
  location: z.string().nullish(),
});
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listSchedules = async (req, res) => {
  const filterSchema = z.object({
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    employee_id: idSchema().optional(),
    status: z.string().optional(),
    store_id: idSchema().optional(),
    category: z.string().optional(),
  });
  const category =
    req.originalUrl == "/api/collection-point-presence"
      ? "point"
      : req.originalUrl == "/api/store-hours"
        ? "vente"
        : req.originalUrl == "/api/collections"
          ? "collection"
          : req.query?.category;

  const filter = filterSchema.parse({ ...req.query, category });
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};

  if (filter.start_date || filter.end_date) {
    where.scheduled_date = {};
    if (filter.start_date) {
      // Set to start of day (00:00:00)
      const dateFrom = new Date(filter.start_date);
      dateFrom.setHours(0, 0, 0, 0);
      where.scheduled_date[Op.gte] = dateFrom;
    }
    if (filter.end_date) {
      // Set to end of day (23:59:59.999) to include all transactions from that day
      const dateTo = new Date(filter.end_date);
      dateTo.setHours(23, 59, 59, 999);
      where.scheduled_date[Op.lte] = dateTo;
    }
  }
  // if (start_date) {
  //   where.scheduled_date = {
  //     ...(where.scheduled_date || {}),
  //     [Op.gte]: start_date,
  //   };
  // }

  // if (end_date) {
  //   where.scheduled_date = {
  //     ...(where.scheduled_date || {}),
  //     [Op.lte]: end_date,
  //   };
  // }

  if (filter.employee_id) {
    where.assigned_to = filter.employee_id;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.store_id) {
    where.store_id = filter.store_id;
  }

  const include = [
    {
      model: Task,
      // attributes: [],
      // required: false, // LEFT JOIN
    },
    // {
    //   model: User,
    //   attributes: [],
    //   required: false,
    // },
    {
      model: Recyclery,
      attributes: [],
      required: false,
    },
  ];
  if (filter.category == "collection") {
    where.category = filter.category;
    // include.push({ model: CollectionPoint })
  }
  if (filter.category == "vente") {
    where.category = filter.category;
  }
  if (filter.category == "point") {
    where.category = filter.category;
    // include.push({ model: Recyclery })
  }

  const schedules = await TaskSchedule.findAll({
    where,

    // attributes: {
    // include: [
    //   // task_name
    //   [
    //     literal(`
    //   CASE
    //     WHEN "TaskSchedule"."task_id" IS NULL THEN 'Ouverture magasin'
    //     WHEN "Task"."name" IS NULL THEN 'Tâche sans nom'
    //     ELSE "Task"."name"
    //   END
    // `),
    //     "task_name",
    //   ],

    //   // task_description
    //   [
    //     literal(`
    //   CASE
    //     WHEN "TaskSchedule"."task_id" IS NULL THEN "TaskSchedule"."notes"
    //     WHEN "Task"."description" IS NULL THEN "TaskSchedule"."notes"
    //     ELSE "Task"."description"
    //   END
    // `),
    //     "task_description",
    //   ],

    //   // task_category
    //   [
    //     literal(`
    //   CASE
    //     WHEN "TaskSchedule"."task_id" IS NULL THEN 'Ouverture'
    //     WHEN "Task"."category" IS NULL THEN 'collection_operations'
    //     ELSE "Task"."category"
    //   END
    // `),
    //     "task_category",
    //   ],

    //   // task_priority
    //   [
    //     literal(`
    //   CASE
    //     WHEN "TaskSchedule"."task_id" IS NULL THEN 'medium'
    //     WHEN "Task"."priority" IS NULL THEN 'high'
    //     ELSE "Task"."priority"
    //   END
    // `),
    //     "task_priority",
    //   ],

    //   // estimated_duration
    //   [
    //     literal(`
    //   CASE
    //     WHEN "TaskSchedule"."task_id" IS NULL THEN 480
    //     WHEN "Task"."estimated_duration" IS NULL THEN 480
    //     ELSE "Task"."estimated_duration"
    //   END
    // `),
    //     "estimated_duration",
    //   ],

    //   // employee_name
    //   // [
    //   //   fn("COALESCE", col("User.username"), "Utilisateur inconnu"),
    //   //   "employee_name",
    //   // ],

    //   // // employee_email
    //   // [col("User.email"), "employee_email"],

    //   // // employee_phone
    //   // [col("User.phone"), "employee_phone"],

    //   // // store_name
    //   // [
    //   //   fn("COALESCE", col("Recyclery.name"), "Magasin inconnu"),
    //   //   "store_name",
    //   // ],
    // ],
    // },

    include,

    order: [
      ["scheduled_date", "ASC"],
      ["start_time", "ASC"],
    ],
  });

  // Récupérer les employés assignés à chaque tâche du planning
  // for (let schedule of schedules) {
  //     const assignedEmployees = await User.findAll({
  //         include: [
  //             {
  //                 model: TaskSchedule,
  //                 required: true, // INNER JOIN
  //                 where: {
  //                     assigned_to: schedule.id,
  //                 },
  //             },
  //         ],
  //     });

  // schedule.assigned_employees = assignedEmployees;

  // Log pour déboguer
  // }

  // Logs de débogage pour diagnostiquer le problème
  const result = schedules.map((s) => {
    return {
      ...s.get({ plain: true }),
      start_time: s.start_time ? new Date(s.start_time) : null,
      end_time: s.end_time ? new Date(s.end_time) : null,
    };
  });
  res.json({
    success: true,
    schedules: result,
    presence_hours: result, //TODO is reccuring => status ? y'a besoin d'un truc pour présent ce jour
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const findSchedule = async (req, res) => {
  const { id } = req.params;
  const schedules = await TaskSchedule.findByPk(id, {
    attributes: {
      include: [
        [
          fn("COALESCE", col("Employee.nom"), "Utilisateur inconnu"),
          "employee_name",
        ],
      ],
    },
    include: [
      { model: Employee },
      {
        model: Task,
      },
    ],
  });

  if (!schedules) {
    return res.status(404).json({
      success: false,
      message: "Planning non trouvé",
    });
  }

  res.json({
    success: true,
    schedule: schedules,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createSchedule = async (req, res) => {
  const data = dataSchema.parse(req.body);

  const schedule = await TaskSchedule.create({
    ...data,
    name: data.name ?? data.category,
  });

  res.status(201).json({
    success: true,
    message: "Planning créé avec succès",
    schedule,
    // schedule_id: result.id,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateSchedule = async (req, res) => {
  const { id } = req.params;

  const data = dataSchema.parse(req.body);

  // Vérifier que le planning existe
  const existingSchedules = await TaskSchedule.findByPk(id);

  if (!existingSchedules) throw new createHttpError[404]("Planning non trouvé");

  if (!data.name) data.name = data.category;
  await existingSchedules.update({ ...data, name: data.name ?? data.category });

  res.json({
    success: true,
    message: "Planning mis à jour avec succès",
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteSchedule = async (req, res) => {
  const id = idSchema().parse(req.params.id);

  const scheduleToDelete = await TaskSchedule.findByPk(id);
  if (!scheduleToDelete) throw new createHttpError[404]("Planning non trouvé");
  scheduleToDelete.destroy();

  res.json({
    success: true,
    message: "Planning supprimé avec succès",
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const getEmployeeSchedule = async (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};

  if (start_date) {
    where.scheduled_date = {
      ...(where.scheduled_date || {}),
      [Op.gte]: start_date,
    };
  }
  if (end_date) {
    where.scheduled_date = {
      ...(where.scheduled_date || {}),
      [Op.lte]: end_date,
    };
  }

  where.assigned_to = employee_id;

  const schedules = await TaskSchedule.findAll({
    where,
    include: [{ model: Task }],
    order: [["scheduled_date"], ["start_time"]],
  });

  res.json({
    success: true,
    schedules: schedules,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const addEmployeeToSchedule = async (req, res) => {
  const scheduleId = idSchema("ID tâche du planning requis").parse(
    req.params.scheduleId,
  );

  const employee_id = idSchema("ID employé requis").parse(req.body.employee_id);

  // Vérifier que la tâche du planning existe et récupérer ses détails
  const task = await Task.findByPk(scheduleId, {
    include: [{ model: Employee }],
  });

  if (!task) throw new createHttpError[404]("Tâche du planning non trouvée");

  const currentSchedule = task;

  // Déterminer le jour de la semaine de la tâche
  const taskDate = new Date(currentSchedule.scheduled_date);
  const dayOfWeek = taskDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  // Vérifier que l'employé existe, appartient au bon magasin ET est présent ce jour-là
  let employee = await Employee.findOne({
    where: { id: employee_id },
    include: [
      {
        model: Recyclery,
        as: "stores",
        where: currentSchedule.store_id
          ? { store_id: currentSchedule.store_id }
          : {},
      },
      {
        model: EmployeeWorkdays,
        // as:"horaires",
        where: { day_of_week: dayOfWeek },
      },
    ],
  });

  if (!employee)
    throw new createHttpError[404](
      `Employé non trouvé, n'appartient pas à ce magasin ou ne travaille pas le ${dayOfWeek}`,
    );

  // Vérifier si l'assignation existe déjà
  //TODO check dans le model
  if (task.Employees?.some((e) => e.id === employee.id))
    throw new createHttpError.Conflict(
      "Cet employé est déjà assigné à cette tâche",
    );

  // Créer l'assignation
  await task.addEmployee(employee);

  res.json({
    success: true,
    message: "Employé assigné avec succès",
    task_schedule: task,
  });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeEmployeeFromSchedule = async (req, res) => {
  const scheduleId = idSchema("ID tâche du planning requis").parse(
    req.params.scheduleId,
  );
  const employeeId = idSchema("ID employé requis").parse(req.params.employeeId);

  const result = await Task.findByPk(scheduleId, {
    include: [{ model: Employee }],
  });
  if (!result) throw new createHttpError[404]("Assignation non trouvée");

  await result.removeEmployee(employeeId);
  // const result = await TaskSchedule.destroy({
  //   // where: { schedule_id: scheduleId, employee_id: employeeId },
  // });

  res.json({
    success: true,
    message: "Employé retiré avec succès",
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const findAvailableEMployee = async (req, res) => {
  const { scheduleId } = req.params;

  // Récupérer les détails de la tâche
  const schedule = await Task.findByPk(scheduleId, {
    include: [{ model: Employee }],
  });

  if (!schedule) throw new createHttpError[404]("Tâche non trouvée");

  const currentSchedule = schedule;

  // Récupérer les employés du magasin ET présents ce jour-là
  // Si pas de store_id, afficher tous les employés présents
  let allEmployees;

  // Déterminer le jour de la semaine de la tâche
  const taskDate = new Date(currentSchedule.scheduled_date);
  const dayOfWeek = taskDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const newYear = new Date(taskDate.getFullYear(), 0, 1);
  const dayNumber = Math.floor((taskDate - newYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((taskDate.getDay() + 1 + dayNumber) / 7);
  if (!schedule.store_id)
    allEmployees = await Employee.findAll({
      include: [
        {
          model: EmployeeWorkdays,
          // as:"horaires",
          attributes: [],
          required: true, // INNER JOIN
          where: {
            day_of_week: dayOfWeek,
            is_working: true, // or 1
            week: weekNumber % 2 ? "week2" : "week1",
          },
        },
      ],
      distinct: true,
    });
  else
    allEmployees = await Employee.findAll({
      include: [
        {
          model: EmployeeWorkdays,
          // as:"horaires",
          attributes: [],
          required: true, // INNER JOIN
          where: {
            day_of_week: dayOfWeek,
            is_working: true, // or 1
            week: weekNumber % 2 ? "week2" : "week1",
          },
        },
        {
          model: Recyclery,
          as: "stores",
          where: { id: schedule.store_id },
          required: true,
        },
      ],
      distinct: true,
    });

  // Pour chaque employé, vérifier s'il est disponible
  const availableEmployees = [];

  const start = new Date(currentSchedule.scheduled_date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(currentSchedule.scheduled_date);
  end.setHours(23, 59, 59, 999);

  for (const employee of allEmployees) {
    // Vérifier les conflits d'horaires pour cet employé

    const conflicts = await Task.findAll({
      where: {
        // assigned_to: employee.id,
        scheduled_date: { [Op.between]: [start, end] },
        id: { [Op.ne]: scheduleId },

        // start_time: { [Op.lt]: currentSchedule.end_time },
        // end_time: { [Op.gt]: currentSchedule.start_time },
      },
      include: [
        {
          model: Employee,
          where: { id: employee.id },
          required: true,
        },
      ],
    });
    const toMinutes = (/** @type {Date | number} */ v) => {
      const d = v instanceof Date ? v : new Date(v);
      return d.getHours() * 60 + d.getMinutes();
    };
    const newStart = toMinutes(schedule.start_time);
    const newEnd = toMinutes(schedule.end_time);

    const hasOverlap = conflicts.filter((e) => {
      if (!e.scheduled_date || !e.start_time || !e.end_time) return false;
      const start = toMinutes(e.start_time);
      const end = toMinutes(e.end_time);
      return start < newEnd && end > newStart;
    });

    // Vérifier si l'employé est déjà assigné à cette tâche
    //FIXME
    // const alreadyAssigned = await TaskSchedule.findAll({
    //   // where: { schedule_id: scheduleId, employee_id: employee.id },
    // });

    availableEmployees.push({
      ...employee.get({ plain: true }),
      is_available: hasOverlap.length === 0,
      has_conflicts: hasOverlap.length > 0,
      conflicts: hasOverlap,
      already_assigned: schedule.Employees?.some((u) => u.id == employee.id),
    });
  }

  res.json({
    success: true,
    employees: availableEmployees,
    schedule_info: {
      id: currentSchedule.id,
      scheduled_date: currentSchedule.scheduled_date,
      start_time: currentSchedule.start_time,
      end_time: currentSchedule.end_time,
    },
  });
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const planningStats = async (req, res) => {
  const { start_date, end_date } = req.query;
  /**
   * @type {import("sequelize").WhereOptions}
   */
  const where = {};

  if (start_date) {
    where.scheduled_date = {
      ...(where.scheduled_date || {}),
      [Op.gte]: start_date,
    };
  }
  if (end_date) {
    where.scheduled_date = {
      ...(where.scheduled_date || {}),
      [Op.lte]: end_date,
    };
  }

  // Statistiques générales

  const stats = await TaskSchedule.findOne({
    attributes: [
      [fn("COUNT", col("*")), "total_schedules"],

      [
        fn("SUM", literal(`CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END`)),
        "scheduled_count",
      ],

      [
        fn(
          "SUM",
          literal(`CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END`),
        ),
        "in_progress_count",
      ],

      [
        fn("SUM", literal(`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`)),
        "completed_count",
      ],

      [
        fn("SUM", literal(`CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END`)),
        "cancelled_count",
      ],
    ],
    raw: true,
  });

  // Tâches les plus planifiées
  const topTasks = await TaskSchedule.findAll({
    attributes: {
      include: [[fn("COUNT", col("*")), "schedule_count"]],
    },
    include: [{ model: Task }],
    group: [
      [Task, "id"],
      [Task, "name"],
      [Task, "category"],
    ],
    order: ["scheduled_count", "DESC"],
    limit: 5,
  });

  // Employés les plus occupés
  const topEmployees = await TaskSchedule.findAll({
    attributes: [
      [
        fn("COALESCE", col("Employee.nom"), "Utilisateur inconnu"),
        "employee_name",
      ],
      [fn("COUNT", col("*")), "schedule_count"],
    ],
    include: [{ model: Employee }],
    group: [
      [Employee, "id"],
      // [Employee, "nom"],
    ],
    order: ["schedule_count", "DESC"],
    limit: 5,
  });

  res.json({
    success: true,
    stats: {
      overview: stats[0],
      topTasks: topTasks,
      topEmployees: topEmployees,
    },
  });
};
