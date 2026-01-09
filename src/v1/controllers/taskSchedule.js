
import { col, fn, literal, Op } from "sequelize";
import * as z from "zod"
import db from "../../models/index.js";
import category from "../../models/category.js";

const { TaskSchedule, Task, User, Recyclery, EmployeeWorkdays, CollectionPoint } = db;

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listSchedules = async (req, res) => {
    const filterSchema = z.object({
        start_date: z.coerce.date().optional(),
        end_date: z.coerce.date().optional(),
        employee_id: z.coerce.number().positive().optional(),
        status: z.string().optional(),
        store_id: z.coerce.number().positive().optional(),
        category: z.string().optional()
    })
    const filter = filterSchema.parse(req.query)
    /**
     * @type {import("sequelize").WhereOptions}
     */
    const where = {};

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
            attributes: [],
            required: false, // LEFT JOIN
        }
        // {
        //   model: User,
        //   attributes: [],
        //   required: false,
        // },
        // {
        //     model: Recyclery,
        //     attributes: [],
        //     required: false,
        // },

    ]
    if (filter.category == "collection") {
        include.push({ model: CollectionPoint })
    }
    if (filter.category == "vente") {
        include.push({ model: Recyclery })
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

    res.json({
        success: true,
        schedules: schedules,
    });
}
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
                    fn("COALESCE", col("User.username"), "Utilisateur inconnu"),
                    "employee_name",
                ],
            ],
        },
        include: [
            { model: User },
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
}
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createSchedule = async (req, res) => {
    const {
        task_id,
        assigned_to,
        store_id,
        scheduled_date,
        start_time,
        end_time,
        notes,
    } = req.body;

    const dataSchema = z.object({
        scheduled_date:z.coerce.date("date requis"),
        start_time:z.coerce.date("heure de debut requis"),
        end_time:z.coerce.date("heure de fin requis"),
    })


    const where = {
        scheduled_date,
        status: {
            [Op.in]: ["scheduled", "in_progress"],
        },
        [Op.not]: {
            [Op.or]: [
                { end_time: { [Op.lte]: start_time } },
                { start_time: { [Op.gte]: end_time } },
            ],
        },
    };
    // Vérifier que la tâche existe (seulement si task_id est fourni)
    if (task_id) {
        const tasks = await Task.findByPk(task_id);

        if (!tasks) {
            return res.status(404).json({
                success: false,
                message: "Tâche non trouvée",
            });
        }
    }

    // Vérifier que l'employé existe (seulement si assigned_to est fourni)
    if (assigned_to) {
        const users = await User.findByPk(assigned_to);

        if (!users) {
            return res.status(404).json({
                success: false,
                message: "Employé non trouvé",
            });
        }
        where.assigned_to = assigned_to;
    }

    // Vérifier les conflits d'horaires (désactivé temporairement pour debug)

    const conflicts = await TaskSchedule.findAll({
        where,
    });

    // Gérer les tâches avec task_id null (tâches d'ouverture)

    if (task_id === null || task_id === "null") {
        // Vérifier que la tâche avec ID 1 existe, sinon en créer une
        const task1 = await Task.findOrCreate({
            where: { id: 1 },
            defaults: {
                name: "Tâche par défaut",
                description: "Tâche par défaut pour les tâches d ouverture",
                category: "store_operations",
                priority: "medium",
                estimated_duration: 480,

                location: "Magasin",
                is_recurring: false,
                recurrence_pattern: "none",
                status: "active",
            },
        });
    }

    // Pour les tâches d'ouverture, on utilise la tâche par défaut (ID 1)

    const result = await TaskSchedule.create({
        task_id: task_id === null || task_id === "null" ? 1 : task_id,
        assigned_to: assigned_to ? assigned_to : null,
        store_id,
        scheduled_date,
        start_time,
        end_time,
        notes,
    });

    res.status(201).json({
        success: true,
        message: "Planning créé avec succès",
        // schedule_id: result.id,
    });
}
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateSchedule = async (req, res) => {
    const { id } = req.params;
    const {
        task_id,
        assigned_to,
        scheduled_date,
        start_time,
        end_time,
        status,
        notes,
    } = req.body;

    // Vérifier que le planning existe
    const existingSchedules = await TaskSchedule.findByPk(id);

    if (!existingSchedules) {
        return res.status(404).json({
            success: false,
            message: "Planning non trouvé",
        });
    }

    // Vérifier les conflits d'horaires (sauf pour le planning en cours de modification)
    if (assigned_to && scheduled_date && start_time && end_time) {
        const conflicts = await TaskSchedule.findAll({
            where: {
                assigned_to,
                scheduled_date,
                id: { [Op.not]: id },
                status: { [Op.in]: ["scheduled", "in_progress"] },
                start_time: { [Op.lt]: end_time },
                end_time: { [Op.gt]: start_time },
            },
        });

        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Conflit d'horaires avec une autre tâche planifiée",
            });
        }
    }

    if (task_id) {
        existingSchedules.task_id = task_id;
    }
    if (assigned_to) {
        existingSchedules.assigned_to = assigned_to;
    }
    if (scheduled_date) {
        existingSchedules.scheduled_date = scheduled_date;
    }
    if (start_time) {
        existingSchedules.start_time = start_time;
    }
    if (end_time) {
        existingSchedules.end_time = end_time;
    }
    if (status) {
        existingSchedules.status = status;
    }
    if (notes !== undefined) {
        existingSchedules.notes = notes;
    }

    await existingSchedules.save();

    res.json({
        success: true,
        message: "Planning mis à jour avec succès",
    });
}
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteSchedule = async (req, res) => {
    const { id } = req.params;

    const result = await TaskSchedule.destroy({ where: { id } });

    if (result === 0) {
        return res.status(404).json({
            success: false,
            message: "Planning non trouvé",
        });
    }

    res.json({
        success: true,
        message: "Planning supprimé avec succès",
    });
}

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
}
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const addEmployeeToSchedule = async (req, res) => {
    const { scheduleId } = req.params;
    const { employee_id } = req.body;

    if (!employee_id) {
        return res.status(400).json({
            success: false,
            message: "ID employé requis",
        });
    }

    // Vérifier que la tâche du planning existe et récupérer ses détails
    // const taskQuery = "SELECT * FROM task_schedules WHERE id = ?";
    const task = await Task.findByPk(scheduleId, {
        include: [{ model: User }],
    });

    if (!task) {
        return res.status(404).json({
            success: false,
            message: "Tâche du planning non trouvée",
        });
    }

    const currentSchedule = task;

    // Déterminer le jour de la semaine de la tâche
    const taskDate = new Date(currentSchedule.scheduled_date);
    const dayOfWeek = taskDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

    // Vérifier que l'employé existe, appartient au bon magasin ET est présent ce jour-là
    let employee = await User.findAll({
        where: { id: employee_id, role: "employee" },
        include: [
            {
                model: Recyclery,
                as: "stores",
                where: { id: currentSchedule.store_id || 1 },
            },
            { model: EmployeeWorkdays, where: { day_of_week: dayOfWeek } },
        ],
    });

    if (employee.length === 0) {
        return res.status(404).json({
            success: false,
            message: `Employé non trouvé, n'appartient pas à ce magasin ou ne travaille pas le ${dayOfWeek}`,
        });
    }

    // Vérifier si l'assignation existe déjà

    if (task.Users.includes(employee[0].id)) {
        return res.status(400).json({
            success: false,
            message: "Cet employé est déjà assigné à cette tâche",
        });
    }

    // NOUVELLE LOGIQUE : Vérifier les conflits d'horaires

    // const conflicts = await TaskSchedule.findAll({
    //   attributes: [
    //     "id",
    //     "scheduled_date",
    //     "start_time",
    //     "end_time",
    //     [
    //       literal(`
    //     CASE
    //       WHEN "TaskSchedule"."task_id" IS NULL THEN 'Ouverture magasin'
    //       WHEN "Task"."name" IS NULL THEN 'Tâche sans nom'
    //       ELSE "Task"."name"
    //     END
    //   `),
    //       "task_name",
    //     ],
    //   ],

    //   include: [
    //     {
    //       model: Task,
    //       attributes: [],
    //       required: false,
    //     },
    //   ],

    //   where: {
    //     employee_id: employee_id,
    //     scheduled_date: currentSchedule.scheduled_date,
    //     id: { [Op.ne]: scheduleId },

    //     start_time: { [Op.lt]: currentSchedule.end_time },
    //     end_time: { [Op.gt]: currentSchedule.start_time },
    //   },
    // });

    // if (conflicts.length > 0) {
    //   const conflictDetails = conflicts
    //     .map((c) => `${c.task_name} (${c.start_time}-${c.end_time})`)
    //     .join(", ");

    //   return res.status(400).json({
    //     success: false,
    //     message: `L'employé est déjà assigné à d'autres tâches à ce moment : ${conflictDetails}`,
    //     conflicts: conflicts,
    //   });
    // }

    // Créer l'assignation
    await task.addUser(employee);
    // const created = await TaskSchedule.create({
    //   // schedule_id: scheduleId,
    //   employee_id,
    //   assigned_at: Date.now(),
    // });

    res.json({
        success: true,
        message: "Employé assigné avec succès",
        task_schedule: task,
    });
}
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeEmployeeFromSchedule = async (req, res) => {
    const { scheduleId, employeeId } = req.params;

    const query =
        "DELETE FROM task_schedule_employees WHERE schedule_id = ? AND employee_id = ?";
    const result = await Task.findByPk(scheduleId, {
        include: [{ model: User }],
    });

    await result.removeUser(employeeId)
    // const result = await TaskSchedule.destroy({
    //   // where: { schedule_id: scheduleId, employee_id: employeeId },
    // });

    if (result === 0) {
        return res.status(404).json({
            success: false,
            message: "Assignation non trouvée",
        });
    }

    res.json({
        success: true,
        message: "Employé retiré avec succès",
    });
}

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const findAvailableEMployee = async (req, res) => {
    const { scheduleId } = req.params;

    // Récupérer les détails de la tâche
    const scheduleQuery = "SELECT * FROM task_schedules WHERE id = ?";
    const schedule = await Task.findByPk(scheduleId, {
        include: [{ model: User }],
    });

    if (!schedule) {
        return res.status(404).json({
            success: false,
            message: "Tâche non trouvée",
        });
    }

    const currentSchedule = schedule;

    // Récupérer les employés du magasin ET présents ce jour-là
    // Si pas de store_id, afficher tous les employés présents
    let allEmployees;

    // Déterminer le jour de la semaine de la tâche
    const taskDate = new Date(currentSchedule.scheduled_date);
    const dayOfWeek = taskDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

    allEmployees = await User.findAll({
        attributes: ["id", "username", "email", "role"],
        where: {
            role: "employee",
        },
        include: [
            {
                model: EmployeeWorkdays,
                attributes: [],
                required: true, // INNER JOIN
                where: {
                    day_of_week: dayOfWeek,
                    is_working: true, // or 1
                },
            },
        ],
        distinct: true,
    });

    // Pour chaque employé, vérifier s'il est disponible
    const availableEmployees = [];

    for (const employee of allEmployees) {
        // Vérifier les conflits d'horaires pour cet employé

        const conflicts = await Task.findAll({
            where: {
                // assigned_to: employee.id,
                scheduled_date: currentSchedule.scheduled_date,
                id: { [Op.ne]: scheduleId },

                start_time: { [Op.lt]: currentSchedule.end_time },
                end_time: { [Op.gt]: currentSchedule.start_time },
            },
            include: [
                {
                    model: User,
                    where: { id: employee.id },
                },
            ],
        });

        // Vérifier si l'employé est déjà assigné à cette tâche
        //FIXME
        // const alreadyAssigned = await TaskSchedule.findAll({
        //   // where: { schedule_id: scheduleId, employee_id: employee.id },
        // });

        availableEmployees.push({
            ...employee.get({ plain: true }),
            is_available: conflicts.length === 0,
            has_conflicts: conflicts.length > 0,
            conflicts: conflicts,
            already_assigned: schedule.Users.some((u) => u.id == employee.id),
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
}



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
                fn(
                    "SUM",
                    literal(`CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END`)
                ),
                "scheduled_count",
            ],

            [
                fn(
                    "SUM",
                    literal(`CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END`)
                ),
                "in_progress_count",
            ],

            [
                fn(
                    "SUM",
                    literal(`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`)
                ),
                "completed_count",
            ],

            [
                fn(
                    "SUM",
                    literal(`CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END`)
                ),
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
                fn("COALESCE", col("User.name"), "Utilisateur inconnu"),
                "employee_name",
            ],
            [fn("COUNT", col("*")), "schedule_count"],
        ],
        include: [{ model: User }],
        group: [
            [User, "id"],
            [User, "username"],
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
}