import { Op } from "sequelize";
import db from "../../models/index.js";
import createHttpError from "http-errors";

const { Task, User, TaskSchedule } = db;

export const useTask = () => {
    const list = async (data) => {
        /**
          * @type {import("sequelize").WhereOptions<import("../../models/types/taskModel.js").TaskAttributes>}
          */
        const where = {};
        if (data.category) where.category = data.category;

        if (data.priority) where.priority = data.priority;

        if (data.search)
            where[Op.or] = [
                { name: { [Op.like]: data.search } },
                { description: { [Op.like]: data.search } },
            ];

        /**
         * @type {import("sequelize").FindOptions<import("../../models/types/taskModel.js").TaskAttributes>["include"]}
         */
        const include = [];
        if (data.include.includes("user"))
            include.push({
                model: User,
            })

        const tasks = await Task.findAll({
            include,
            where,
            order: [["createdAt", "DESC"]],
        });

        // Parser les champs JSON
        // const parsedTasks = tasks.map((task) => ({
        //   ...task,
        //   required_skills: task.required_skills
        //     ? JSON.parse(task.required_skills)
        //     : [],
        //   equipment_needed: task.equipment_needed
        //     ? JSON.parse(task.equipment_needed)
        //     : [],
        // }));
    }
    const find = async (id) => {
        const task = await Task.findByPk(id, { include: [{ model: User }] });
        if (!task) throw new createHttpError.NotFound("Tâche non trouvée")
        return task
    }
    const create = async (data) => {
        const task = await Task.create({
            ...data,
        });


    }
    const update = async (id, data) => {
        const existing = await Task.findByPk(id);

        if (!existing) throw new createHttpError.NotFound("Tâche non trouvée")
        existing.name = data.name;
        existing.description = data.description;
        existing.category = data.category;
        existing.priority = data.priority;
        existing.estimated_duration = data.estimated_duration;
        existing.required_skills = JSON.stringify(data.required_skills || []);
        existing.location = location;
        existing.equipment_needed = JSON.stringify(data.equipment_needed || []);
        existing.hourly_rate = data.hourly_rate;

        existing.assigned_to = data.assigned_to;
        existing.notes = data.notes;
        await existing.save();

        return existing

    }
    const remove = async (id) => {
        const deleted = await Task.destroy({ where: { id } });
        if (deleted == 0) throw createHttpError.NotFound("Tâche non trouvée")
    }

    const addUser = async (employee_id, taskId) => {
        const task = await find(taskId)
        await task.addUser(employee_id)
    }

    const removeUser = async (employee_id, taskId) => {
        const task = await find(taskId)
        await task.removeUser(employee_id)
    }
    return {
        list, find, create, update, remove, addUser, removeUser
    }
}