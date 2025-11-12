
import db from "../models/index.js";
const { Category } = db


export const listCategories = async (req, res) => {
    const categories = Category.findAll();

    res.json({
        success: true,
        categories,
    });
}

export const listSubcategories = async (req, res) => {
    const subcategories = await Category.findAll({
        where: { parent_id: { [Op.ne]: null } },
    });

    res.json({
        success: true,
        subcategories,
    });
}


export const createCategorie = async (req, res) => {
    const { name, description, icon, parent_id } = req.body;

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
    const existingCategory = await existingCategory(name, parent_id)

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
        parent_id,
    });

    res.status(201).json({
        success: true,
        message: "Catégorie créée avec succès",
        category,
    });
}

export const deleteCategorie = async (req, res) => {
    const { id } = req.params;
    //TODO cascade delete les subcategories
    const deleted = await Category.destroy(id);
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

export const updateCategorie = async (req, res) => {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    // Validation
    if (!name || !description) {
        return res.status(400).json({
            success: false,
            error: "Le nom et la description sont requis",
        });
    }
    const category = await Category.findOne(id);

    // Vérifier si la catégorie existe
    if (!category) {
        return res.status(404).json({
            success: false,
            error: "Catégorie non trouvée",
        });
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé
    const existingCategory = await existingCategory(name, category.parent_id)

    if (existingCategory) {
        return res.status(400).json({
            success: false,
            error: "Une catégorie avec ce nom existe déjà",
        });
    }
    category.name ??= name;
    category.icon ??= icon;
    category.description ??= description;
    category.parent_id ??= parent_id;
    await category.save();

    res.json({
        success: true,
        message: "Catégorie mise à jour avec succès",
        category,
    });
}


export const existingCategory = async (name, parent_id) => {
    return await Category.findOne({
        where: { name, parent_id },
    });
}