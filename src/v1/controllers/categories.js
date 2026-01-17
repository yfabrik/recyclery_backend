
import { Op } from "sequelize";
import db from "../../models/index.js"
import * as z from "zod"
import logger from "../../services/logger.js";
import createHttpError from "http-errors";
import { idSchema } from "../../services/zod.js";
const { Category } = db

const dataSchema = z.object({
    name: z.string("Le nom est requis"),
    description: z.string().optional(),
    icon: z.string().optional(),//TODO should be enum with list of icon
    parent_id: idSchema().nullable().default(null)
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
    logger.info("called list subcategorie REMAKE")
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
    const data = dataSchema.parse(req.body)
    // Vérifier si la catégorie existe déjà
    const existingCategory = await findExistingCategory(data.name, data.parent_id)

    if (existingCategory) throw new createHttpError[404]("Une catégorie avec ce nom existe déjà")//TODO hook

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
    const id = idSchema().parse(req.params.id);
    const deleted = await Category.destroy({ where: { id } });
    if (deleted == 0) throw new createHttpError[404]("Catégorie non trouvée")
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
    const id = idSchema().parse(req.params.id);
    const data = dataSchema.parse(req.body)

    const category = await Category.findByPk(id);

    // Vérifier si la catégorie existe
    if (!category) throw new createHttpError[404]("Catégorie non trouvée")

    // Vérifier si le nouveau nom n'est pas déjà utilisé
    const existingCategory = await findExistingCategory(data.name, category.parent_id)

    if (existingCategory && existingCategory.id != category.id) throw new createHttpError[404]("Une catégorie avec ce nom existe déjà")//TODO make hook

    await category.update({
        ...data
    })
    
    res.json({
        success: true,
        message: "Catégorie mise à jour avec succès",
        category,
    });
}

