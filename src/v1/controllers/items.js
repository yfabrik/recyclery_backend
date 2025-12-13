import db from  "../../models/index.js"

import { Op } from "sequelize";

const { LabeledItem, Category, User } = db;

// export const listItems = async (req, res) => {
//     const { recyclery_id, category_id, status } = req.query;
//     const where = {};
//     if (recyclery_id) where.recyclery_id = recyclery_id;
//     if (category_id) where.category_id = category_id;
//     if (status) where.status = status;

//     const items = await Item.findAll({
//         where,
//     });

//     res.json({ items });
// }

export const listLabeledItem = async (req, res) => {
    const { status, category_id, search, recyclery_id } = req.query;

    const where = {};

    if (status) where.status = status;
    if (category_id) where.category_id = category_id;
    if (recyclery_id) where.recyclery_id = recyclery_id;
    if (search) {
        const likeQuery = { [Op.like]: `%${search}%` };
        where[Op.or] = [
            { name: likeQuery },
            { description: likeQuery },
            { barcode: likeQuery },
        ];
    }

    const labeledItems = await LabeledItem.findAll({
        where,
        include: [
            {
                model: Category,
                as: "category",
                attributes: ["id", "name"],
            },
            {
                model: Category,
                as: "subcategory",
                attributes: ["id", "name"],
            },
            {
                model: User,
                as: "createdBy",
                attributes: ["id", "username"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, items: labeledItems });
}

export const getItemFromBarcode = async (req, res) => {
    const { barcode } = req.params;

    const item = LabeledItem.findOne({ where: barcode });

    if (!item) {
        return res
            .status(404)
            .json({ success: false, error: "Article non trouvé" });
    }

    res.json({ success: true, item });
}

// export const createItem = async (req, res) => {
//     const {
//         name,
//         description,
//         category_id,
//         barcode,
//         purchase_price,
//         selling_price,
//         recyclery_id,
//     } = req.body;

//     if (!name || !recyclery_id) {
//         return res.status(400).json({ error: "Nom et recyclerie requis" });
//     }

//     const item = await Item.create({
//         name,
//         description,
//         category_id,
//         barcode,
//         purchase_price,
//         selling_price,
//         recyclery_id,
//     });

//     res.status(201).json({
//         message: "Article créé avec succès",
//         item,
//     });
// }

export const createLabeledItem = async (req, res) => {
    let {
        name,
        description,
        category_id,
        subcategory_id,
        weight,
        price,
        cost,
        condition_state,
        location,
        arrival_id,
        purchase_price,
        selling_price,
        recyclery_id
    } = req.body;

    if (!price)
        price ??= selling_price
    if (!cost)
        cost ??= purchase_price

    // Validation des champs requis
    if (!category_id || !price) {
        return res.status(400).json({
            success: false,
            error: "La catégorie et le prix sont obligatoires",
        });
    }

    // Générer un code-barres unique (format: REC + timestamp + random)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
    const barcode = `REC${timestamp}${random}`;

    // Récupérer le nom de la catégorie pour l'utiliser comme nom de l'article
    const category = Category.findByPk(category_id);
    if (!name) name = category ? category.name : "Article";

    const item = await LabeledItem.create({
        barcode,
        name,
        description,
        category_id,
        subcategory_id,
        weight,
        price,
        cost,
        condition_state,
        location,
        arrival_id,
        created_by: req.user.id,
        recyclery_id
    });

    res.status(201).json({
        success: true,
        message: "Article créé avec succès",
        item,
    });
}

export const updateItem = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        description,
        category_id,
        subcategory_id,
        weight,
        price,
        cost,
        condition_state,
        location,
        status,
    } = req.body;

    // Validation des champs requis
    if (!name || !category_id || !price) {
        return res.status(400).json({
            success: false,
            error: "Le nom, la catégorie et le prix sont obligatoires",
        });
    }

    const item = await LabeledItem.findByPk(id);

    const params = [
        name,
        description || null,
        category_id,
        subcategory_id || null,
        weight || null,
        price,
        cost || null,
        condition_state || "good",
        location || null,
        status || "available",
        id,
    ];

    const updated = {
        ...item,
        ...params,
    };

    const newLabel = await updated.save();

    res.json({ success: true, message: "Article mis à jour avec succès" });
}

export const deleteLabeledItem = async (req, res) => {
    const { id } = req.params;
    const deleted = await LabeledItem.destroy({ where: { id } });

    if (deleted === 0) {
        return res
            .status(404)
            .json({ success: false, error: "Article non trouvé" });
    }

    res.json({ success: true, message: "Article supprimé avec succès" });
}

export const tagItemAsSell = async (req, res) => {
    const { id } = req.params;
    const updated = await LabeledItem.update(
        {
            status: "sold",
            sold_at: new Date(),
            sold_by: req.user.id,
        },
        {
            where: {
                id,
                status: "available",
            },
        }
    );

    res.json({ success: true, message: "Article marqué comme vendu" });
}