
import { Op } from "sequelize";
import db from "../../models/index.js"

const { Category } = db

const findExistingCategory = async (name, parent_id = null) => {
    return await Category.findOne({
        where: { [Op.and]: [{ name: name }, { parent_id: parent_id }] }
    });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listCategories = async (req, res) => {
    // const categories = await Category.findAll({ where: { parent_id: { [Op.is]: null } }, include: [{ model: Category, as: "subcategories" }] });
    const categories = await Category.findAll();


    res.json({
        success: true,
        categories,
    });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const listSubcategories = async (req, res) => {
    const subcategories = await Category.findAll({
        where: { parent_id: { [Op.gt]: 0 } },
    });

    res.json({
        success: true,
        subcategories,
    });
}

/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const createCategorie = async (req, res) => {
    const { name, description, icon, parent_id } = req.body;
    const parent = parent_id ?? null

    // Validation
    if (!name) {
        return res.status(400).json({
            success: false,
            error: "Le nom est requis",
        });
    }

    // Utiliser une description par défaut si elle n'est pas fournie
    const finalDescription = description || "Aucune description";

    // Vérifier si la catégorie existe déjà
    const existingCategory = await findExistingCategory(name, parent_id)

    if (existingCategory) {
        return res.status(400).json({
            success: false,
            error: "Une catégorie avec ce nom existe déjà",
        });
    }
    const category = await Category.create({
        name,
        description,
        icon,
        parent_id: parent
    });

    res.status(201).json({
        success: true,
        message: "Catégorie créée avec succès",
        category,
    });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const deleteCategorie = async (req, res) => {
    const { id } = req.params;
    //TODO cascade delete les subcategories
    // const subcategories = await Category.findOne({ where: {parent_id: id} })
    // if(subcategories) return res.status(403).json({succes:false,message:"cant delete, still subcategories"})
    const deleted = await Category.destroy({ where: { id } });
    if (deleted == 0)
        return res.status(404).json({
            success: false,
            error: "Catégorie non trouvée",
        });
    // Vérifier si la catégorie existe

    res.json({
        success: true,
        message: "Catégorie supprimée avec succès",
    });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const updateCategorie = async (req, res) => {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    // Validation
    if (!name) {
        return res.status(400).json({
            success: false,
            error: "Le nom et la description sont requis",
        });
    }
    const category = await Category.findByPk(id);

    // Vérifier si la catégorie existe
    if (!category) {
        return res.status(404).json({
            success: false,
            error: "Catégorie non trouvée",
        });
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé
    const existingCategory = await findExistingCategory(name, category.parent_id)

    if (existingCategory) {
        return res.status(400).json({
            success: false,
            error: "Une catégorie avec ce nom existe déjà",
        });
    }
    category.name = name;
    category.icon = icon;
    category.description = description;
    // category.parent_id = parent;
    await category.save();

    res.json({
        success: true,
        message: "Catégorie mise à jour avec succès",
        category,
    });
}

