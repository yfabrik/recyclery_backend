
import { Op } from "sequelize";
import db from "../../models/index.js"
import * as z from "zod"
const { Category } = db

const dataSchema = z.object({
    name: z.string("Le nom est requis"),
    description: z.string().optional(),
    icon: z.string().optional(),//TODO should be enum with list of icon
    parent_id: z.coerce.number().nullable().default(null)
})
/**
 * 
 * @param {string} name 
 * @param {number|null} parent_id 
 * @returns 
 */
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
    const filtersSchema = z.object({
        include: z.string()
            .optional()
            .transform((val) => (val ? val.split(",") : [])),
        only_category: z.coerce.boolean().optional().default(false),
        only_sub: z.coerce.boolean().optional().default(false)


    })
    const filters = filtersSchema.parse(req.query)

    /**
     * @type {import("sequelize").Filterable<import("../../models/types/categoryModel.js").CategoryAttributes>['where']}
     */
    const where = {}
    /**
 * @type {import("sequelize"). FindOptions<import("../../models/types/categoryModel.js").CategoryAttributes>["include"]}
 */
    const include = []
    if (filters.only_category)
        where.parent_id = { [Op.is]: null }
    if (filters.only_sub) {
        where.parent_id = { [Op.not]: null }
    }
    if (filters.include.includes("Category"))
        include.push({ model: Category, as: "subcategories" })

    // const categories = await Category.findAll({ where: { parent_id: { [Op.is]: null } }, include: [{ model: Category, as: "subcategories" }] });
    const categories = await Category.findAll({ where, include });


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
    // const { name, description, icon, parent_id } = req.body;
    // const parent = parent_id ?? null



    const data = dataSchema.parse(req.body)


    // Validation
    // if (!name) {
    //     return res.status(400).json({
    //         success: false,
    //         error: "Le nom est requis",
    //     });
    // }

    // // Utiliser une description par défaut si elle n'est pas fournie
    // const finalDescription = description || "Aucune description";

    // Vérifier si la catégorie existe déjà
    const existingCategory = await findExistingCategory(data.name, data.parent_id)

    if (existingCategory) {
        return res.status(400).json({
            success: false,
            error: "Une catégorie avec ce nom existe déjà",
        });
    }
    const category = await Category.create({
        ...data
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

    // const { name, description, icon } = req.body;
    const data = dataSchema.parse(req.body)

    // // Validation
    // if (!name) {
    //     return res.status(400).json({
    //         success: false,
    //         error: "Le nom et la description sont requis",
    //     });
    // }
    const category = await Category.findByPk(id);

    // Vérifier si la catégorie existe
    if (!category) {
        return res.status(404).json({
            success: false,
            error: "Catégorie non trouvée",
        });
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé
    const existingCategory = await findExistingCategory(data.name, category.parent_id)

    if (existingCategory && existingCategory.id != category.id) {
        return res.status(400).json({
            success: false,
            error: "Une catégorie avec ce nom existe déjà",
        });
    }
    category.name = data.name;
    category.icon = data.icon;
    category.description = data.description;
    // category.parent_id = parent;
    await category.save();

    res.json({
        success: true,
        message: "Catégorie mise à jour avec succès",
        category,
    });
}

