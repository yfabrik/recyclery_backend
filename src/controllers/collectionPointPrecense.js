import { Op } from "sequelize";
import db from "../models/index.js";

const { CollectionPointPresence, CollectionPoint,Task } = db;

export const listPointPrecense = async (req, res) => {
    const presence_hours = await CollectionPointPresence.findAll({
        include: [{ model: CollectionPoint }],
    });
    res.json({
        success: true,
        presence_hours,
    });
}

export const detailPointPrecense = async (req, res) => {
    const { collectionPointId } = req.params;
    const presence_hours = await CollectionPointPresence.findByPk(
        collectionPointId,
        { include: [{ model: CollectionPoint }], order: [["day_of_week"]] }
    );
    res.json({
        success: true,
        presence_hours,
    });
}

export const createPointPrecense = async (req, res) => {
    const {
        collection_point_id,
        store_id,
        day_of_week,
        time_slot_name,
        is_present,
        start_time,
        end_time,
        is_24h,
        notes,
    } = req.body;

    // Validation des champs requis
    if (!collection_point_id || !day_of_week) {
        return res.status(400).json({
            success: false,
            message:
                "ID du point de collecte et jour de la semaine sont obligatoires",
        });
    }

    const existing = await CollectionPointPresence.findOne({
        where: { collection_point_id, day_of_week, time_slot_name, store_id },
    });
    // Vérifier si des jours de présence existent déjà pour ce point, ce jour et ce créneau

    if (existing) {
        return res.status(400).json({
            success: false,
            message:
                "Des jours de présence existent déjà pour ce point, ce jour et ce créneau",
        });
    }

    const precence = await CollectionPointPresence.create({
        collection_point_id,
        store_id,
        day_of_week,
        time_slot_name,
        is_present,
        start_time,
        end_time,
        is_24h,
        notes,
    });

    res.json({
        success: true,
        message: "Jours de présence créés avec succès",
        id: precence.id,
    });
}

export const updatePointPrecense = async (req, res) => {
    const { id } = req.params;
    const {
        collection_point_id,
        store_id,
        day_of_week,
        time_slot_name,
        is_present,
        start_time,
        end_time,
        is_24h,
        notes,
    } = req.body;

    const existing = await CollectionPointPresence.findByPk(id);
    // Vérifier que les jours de présence existent

    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Jours de présence non trouvés",
        });
    }

    const conflict = await CollectionPointPresence.findOne({
        where: {
            collection_point_id,
            day_of_week,
            time_slot_name,
            store_id,
            id: { [Op.ne]: id },
        },
    });
    // Vérifier s'il n'y a pas de conflit avec d'autres jours de présence du même point, jour et créneau

    if (conflict) {
        return res.status(400).json({
            success: false,
            message:
                "Des jours de présence existent déjà pour ce point, ce jour et ce créneau",
        });
    }

    existing.collection_point_id ??= collection_point_id;
    existing.store_id ??= store_id;
    existing.day_of_week ??= day_of_week;
    existing.time_slot_name ??= time_slot_name;
    existing.is_present ??= is_present;
    existing.start_time ??= start_time;
    existing.end_time ??= end_time;
    existing.is_24h ??= is_24h;
    existing.notes ??= notes;
    await existing.save();

    res.json({
        success: true,
        message: "Jours de présence mis à jour avec succès",
    });
}

export const deletePointPrecense = async (req, res) => {
    const { id } = req.params;

    const existing = await CollectionPointPresence.findByPk(id);
    // Vérifier que les jours de présence existent

    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Jours de présence non trouvés",
        });
    }
    const deleted = await CollectionPointPresence.destroy({ where: { id } });

    res.json({
        success: true,
        message: "Jours de présence supprimés avec succès",
    });
}