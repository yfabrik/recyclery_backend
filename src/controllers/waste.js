import db from "../models";

const { WasteDisposal, Category, EcoOrganism, User } = db
const generateDisposalNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0");
    return `SORT-${timestamp}-${random}`;
};


export const listWaste = async (req, res) => {
    const {
        category_id,
        subcategory_id,
        eco_organism_id,
        disposal_type,
        date_from,
        date_to,
        page = 1,
        limit = 50,
    } = req.query;

    const where = {};
    if (category_id) where.category_id = category_id;
    if (subcategory_id) where.subcategory_id = subcategory_id;
    if (eco_organism_id) where.eco_organism_id = eco_organism_id;
    if (disposal_type) where.disposal_type = disposal_type;

    if (date_from) {
        where.disposal_date = {
            ...(where.disposal_date || {}),
            [Op.gte]: date_from,
        };
    }

    if (date_to) {
        where.disposal_date = {
            ...(where.disposal_date || {}),
            [Op.lte]: date_to,
        };
    }

    const offset = limit * (page - 1 >= 0 ? page - 1 : 0)
    const waste = await WasteDisposal.findAll({
        where,
        include: [
            { model: Category, as: "category" },
            { model: Category, as: "subcategory" },
            { model: EcoOrganism, as: "eco_organism" },
            { model: User },
        ],
        order: [["disposal_date", "DESC"]],
        offset,
        limit,
    });

    // Get total count for pagination

    const wasteCount = await WasteDisposal.count({ where });
    res.json({
        disposals: waste,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: wasteCount,
            totalPages: Math.ceil(wasteCount / limit),
        },
    });
}

export const detailWaste = async (req, res) => {
    const { id } = req.params;
    const waste = await WasteDisposal.findByPk(id, {
        include: [
            { model: Category, as: "category" },
            { model: Category, as: "subcategory" },
            { model: EcoOrganism, as: "eco_organism" },
            { model: User },
        ],
    });

    if (!waste) {
        return res.status(404).json({ error: "Sortie de déchets non trouvée" });
    }
    res.json({ disposal: waste });
}

export const createWaste = async (req, res) => {
    const {
        disposal_date,
        category_id,
        subcategory_id,
        eco_organism_id,
        disposal_type,
        weight_kg,
        volume_m3,
        transport_method,
        transport_company,
        transport_cost,
        notes,
    } = req.body;

    if (!disposal_date || !disposal_type || !weight_kg) {
        return res.status(400).json({
            error: "Date de sortie, type de sortie et poids sont requis",
        });
    }

    if (disposal_type === "eco_organism" && !eco_organism_id) {
        return res.status(400).json({
            error: "Éco-organisme requis pour ce type de sortie",
        });
    }

    const disposal_number = generateDisposalNumber();

    const waste = await WasteDisposal.create({
        disposal_number,
        disposal_date,
        category_id,
        subcategory_id,
        eco_organism_id,
        disposal_type,
        weight_kg,
        volume_m3,
        transport_method,
        transport_company,
        transport_cost,
        notes,
        created_by: req.user.id,
    });

    res.status(201).json({
        message: "Sortie de déchets créée avec succès",
        disposal_id: waste.id,
        disposal_number: disposal_number,
    });
}

export const updateWaste = async (req, res) => {
    const { id } = req.params;
    const {
        disposal_date,
        category_id,
        subcategory_id,
        eco_organism_id,
        disposal_type,
        weight_kg,
        volume_m3,
        transport_method,
        transport_company,
        transport_cost,
        notes,
    } = req.body;

    if (!disposal_date || !disposal_type || !weight_kg) {
        return res.status(400).json({
            error: "Date de sortie, type de sortie et poids sont requis",
        });
    }

    if (disposal_type === "eco_organism" && !eco_organism_id) {
        return res.status(400).json({
            error: "Éco-organisme requis pour ce type de sortie",
        });
    }

    const waste = await WasteDisposal.findByPk(id);
    waste.disposal_date ??= disposal_date;
    waste.disposal_type ??= disposal_type;
    waste.category_id ??= category_id;
    waste.subcategory_id ??= subcategory_id;
    waste.eco_organism_id ??= eco_organism_id;
    waste.weight_kg ??= weight_kg;
    waste.volume_m3 ??= volume_m3;
    waste.transport_method ??= transport_method;
    waste.transport_company ??= transport_company;
    waste.transport_cost ??= transport_cost;
    waste.notes ??= notes;
    await waste.save();

    res.json({ message: "Sortie de déchets mise à jour avec succès" });
}

export const deleteWaste = async (req, res) => {
    const { id } = req.params;

    const deleted = await WasteDisposal.destroy({ where: { id } });

    if (deleted === 0) {
        return res.status(404).json({ error: "Sortie de déchets non trouvée" });
    }
    res.json({ message: "Sortie de déchets supprimée avec succès" });
}