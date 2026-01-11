import { Op } from "sequelize"
import db from "../../models/index.js"
import createHttpError from "http-errors"
const { Category } = db
export const useCategorie = () => {

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

    const list = async (filters) => {
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
        return categories
    }
    const find = async (id) => {

    }

    const create = async (data) => {
        const existingCategory = await findExistingCategory(data.name, data.parent_id)

        if (existingCategory) {
            throw new createHttpError.Conflict("Une catégorie avec ce nom existe déjà")

        }
        const category = await Category.create({
            ...data
        });
        return category
    }

    const update = async (id, data) => {
        const category = await Category.findByPk(id);

        // Vérifier si la catégorie existe
        if (!category) {
            throw new createHttpError.NotFound("Catégorie non trouvée")

        }

        // Vérifier si le nouveau nom n'est pas déjà utilisé
        const existingCategory = await findExistingCategory(data.name, category.parent_id)

        if (existingCategory && existingCategory.id != category.id) {
            throw new createHttpError.Conflict("Une catégorie avec ce nom existe déjà",)
        }
        category.name = data.name;
        category.icon = data.icon;
        category.description = data.description;
        await category.save();
        return category
    }

    const remove = async (id) => {
        const deleted = await Category.destroy({ where: { id } });
        if (deleted == 0) throw createHttpError.NotFound("Catégorie non trouvée")

    }


    return {
        list, create, update, remove
    }
}