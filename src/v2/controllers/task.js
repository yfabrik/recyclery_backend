
import * as z from "zod";
import { useTask } from "../services/useTask.js";
import { useSchedule } from "../services/useSchedule.js";


/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const listTasks = async (req, res) => {
    const ALLOWED_INCLUDES = ["user", "comments", "project", "task"];
    const includeSchema = z.object({
        include: z
            .string()
            .optional()
            .transform((val) => (val ? val.split(",") : []))
            .pipe(z.array(z.enum(ALLOWED_INCLUDES))),
        category: z.enum(["point", "vente", "collection"]).optional(),
        priority: z.string().optional(),
        search: z.string().optional()
    });
    const filter = includeSchema.parse(req.query);

    const data = useTask().list(filter)

    res.json({
        success: true,
        data
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const detailTask = async (req, res) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = useTask().find(id)


    res.json({
        success: true,
        data
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const createTask = async (req, res) => {
    const dataSchema = z.object({
        name: z.string("Nom requis"),
        description: z.string().optional(),
        category: z.string("categorie requis"),
        priority: z.string("priorité requis"),
        estimated_duration: z.coerce.number().optional(),
        required_skills: z.array(z.string()).optional().default([]).transform(val => JSON.stringify(val)),
        location: z.string().optional(),
        equipment_needed: z.array(z.string()).optional(),
        hourly_rate: z.coerce.number().optional(),
        is_recurring: z.coerce.boolean().optional(),
        recurrence_pattern: z.enum(["daily", "weekly", "monthly", "none"]).optional(),
        assigned_to: z.string().optional(),
        notes: z.string().optional(),
        start_time: z.coerce.date().optional(),
        end_time: z.coerce.date().optional(),
        scheduled_date: z.coerce.date().optional().default(new Date()),
    })

    const data = dataSchema.parse(req.body)
    let schedule = null;
    if (data.recurrence_pattern && data.recurrence_pattern != "none") {
        schedule = useSchedule().create(data)

    }
    else {
        const { is_recurring, recurrence_pattern, ...rest } = data
        schedule = await useTask().create(rest)
    }
    res.json({
        success: true,
        message: "Tâche créée avec succès",
        data: schedule,
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const updateTask = async (req, res) => {
    const id = z.coerce.number().parse(req.params.id);

    const dataSchema = z.object({
        name: z.string("Nom requis"),
        description: z.string().optional(),
        category: z.string("categorie requis"),
        priority: z.string("priorité requis"),
        estimated_duration: z.coerce.number().optional(),
        required_skills: z.array(z.string()).optional().default([]).transform(val => JSON.stringify(val)),
        location: z.string().optional(),
        equipment_needed: z.array(z.string()).optional(),
        hourly_rate: z.coerce.number().optional(),
        is_recurring: z.coerce.boolean().optional(),
        recurrence_pattern: z.string().optional(),
        assigned_to: z.string().optional(),
        notes: z.string().optional(),
        start_time: z.coerce.date().optional(),
        end_time: z.coerce.date().optional(),
        scheduled_date: z.coerce.date().optional().default(new Date()),
    })

    const data = useTask().update(id, dataSchema.parse(req.body))
    res.json({
        success: true,
        message: "Tâche mise à jour avec succès",
        data
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const deleteTask = async (req, res) => {

    const id = z.coerce.number().parse(req.params.id);
    useTask().remove(id)

    res.json({
        success: true,
        message: "Tâche supprimée avec succès",
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const getUsersFromTask = async (req, res) => {
    //TODO use the detail task with query param ?
    const { taskId } = req.params;
    const task = await useTask().find(taskId)
    const data = task.Users
    res.json({
        success: true,
        data
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const addUserToTask = async (req, res) => {
    const { taskId } = req.params;
    const { employee_id } = req.body;

    await useTask().addUser(employee_id, taskId)

    res.json({
        success: true,
        message: "Employé assigné avec succès",
    });
};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const removeUserFromTask = async (req, res) => {
    const { taskId, employeeId } = req.params;
    await useTask().removeUser(employeeId, taskId)

    res.json({
        success: true,
        message: "Employé retiré avec succès",
    });
};
