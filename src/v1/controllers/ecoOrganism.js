import { Op } from "sequelize";
import db from  "../../models/index.js"


const { EcoOrganism, WasteDisposal } = db;

export const listEcoOrganism = async (req, res) => {
    const { active } = req.query
    const where = {}
    if (active) where.is_active = active
    const eco_organisms = await EcoOrganism.findAll({ where });

    res.json({ eco_organisms });
}

export const listActiveEcoOrganism = async (req, res) => {
    req.query.active = 1
    return listEcoOrganism(req, res)
    // const eco_organisms = await EcoOrganism.findAll({ where: { is_active } });

    // res.json({ eco_organisms });
}

export const detailEcoOrganism = async (req, res) => {
    const { id } = req.params;
    const eco_organism = await EcoOrganism.findByPk(id);

    if (!eco_organism) {
        return res.status(404).json({ error: "Éco-organisme non trouvé" });
    }
    res.json({ eco_organism });
}

export const createEcoOrganism = async (req, res) => {
    const {
        name,
        description,
        contact_email,
        contact_phone,
        address,
        website,
        is_active,
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Le nom est requis" });
    }

    // Check if name already exists
    const existing = await EcoOrganism.findOne({ where: { name } });

    if (existing) {
        return res
            .status(400)
            .json({ error: "Un éco-organisme avec ce nom existe déjà" });
    }

    const activeStatus = is_active === undefined ? 1 : is_active ? 1 : 0;

    const created = await EcoOrganism.create({
        name,
        description,
        contact_email,
        contact_phone,
        address,
        website,
        is_active: activeStatus,
    });

    res.status(201).json({
        message: "Éco-organisme créé avec succès",
        eco_organism_id: created.id,
    });
}

export const updateEcoOrganism = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        description,
        contact_email,
        contact_phone,
        address,
        website,
        is_active,
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Le nom est requis" });
    }

    // Check if name already exists for different eco-organism
    const existing = await EcoOrganism.findOne({
        where: { name, id: { [Op.ne]: id } },
    });

    if (existing) {
        return res
            .status(400)
            .json({ error: "Un éco-organisme avec ce nom existe déjà" });
    }

    const activeStatus = is_active === undefined ? 1 : is_active ? 1 : 0;
    const eco_organism = await EcoOrganism.findByPk(id);
    eco_organism.name = name;
    eco_organism.description = description;
    eco_organism.contact_email = contact_email;
    eco_organism.contact_phone = contact_phone;
    eco_organism.address = address;
    eco_organism.website = website;
    eco_organism.is_active = is_active;

    await eco_organism.save();

    res.json({ message: "Éco-organisme mis à jour avec succès" });
}

export const deleteEcoOrganism = async (req, res) => {
    const { id } = req.params;

    const waste = await WasteDisposal.count({ where: { eco_organism_id: id } });
    // Check if eco-organism is used in waste disposals

    if (waste > 0) {
        // If used in waste disposals, deactivate instead of delete
        await EcoOrganism.update({ is_active: 0 }, { where: { id } });

        res.json({ message: "Éco-organisme désactivé avec succès" });
    } else {
        const deleted = await EcoOrganism.destroy({ where: { id } });
        // If not used, delete permanently

        if (deleted === 0) {
            return res.status(404).json({ error: "Éco-organisme non trouvé" });
        }
        res.json({ message: "Éco-organisme supprimé avec succès" });
    }
}