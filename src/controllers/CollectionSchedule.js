import { Op } from "sequelize";
import db from "../models";

const { CollectionSchedule, CollectionPoint, User ,CollectionReceipt} = db

const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    return `COL-${year}${month}${day}-${timestamp}`;
};


export const listcollectionSchedule = async (req, res) => {
    const { date_from, date_to, status, employee_id } = req.query;
    const where = {};
    if (date_from) {
        where.scheduled_date = {
            ...(where.scheduled_date || {}),
            [Op.gte]: date_from,
        };
    }
    if (date_to) {
        where.scheduled_date = { ...(where.scheduled_date || {}), [Op.lte]: date_to };
    }
    if (status) where.status = status;
    if (employee_id) where.employee_id = employee_id;

    const schedules = await CollectionSchedule.findAll({
        include: [{ model: CollectionPoint }, { model: User }],
    });

    res.json({
        success: true,
        schedules,
    });
}

export const createCollectionSchedule = async (req, res) => {
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
}

export const updateCollectionSchedule = async (req, res) => {
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
}

export const deleteCollectionSchedule = async (req, res) => {
    const { id } = req.params;

    const schedule = await CollectionSchedule.destroy({ where: { id } });

    res.json({
        success: true,
        message: "Planning supprimé avec succès",
    });
}

export const generateBSD = async (req, res) => {
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
        // receipt_number,
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
}

export const detailBSD = async (req, res) => {
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
}