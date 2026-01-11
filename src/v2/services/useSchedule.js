import db from "../../models/index.js"

const { TaskSchedule } = db

export const useSchedule = () => {
    const list = () => {

    }

    const create = async (data) => {
        const schedule = await TaskSchedule.create({
            ...data
        })
        return schedule
    }

    return {
        create
    }
}