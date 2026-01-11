
import * as z from "zod"
import { useCategorie } from "../services/useCategorie.js"


const categorie = useCategorie()

const dataSchema = z.object({
    name: z.string("Le nom est requis"),
    description: z.string().optional(),
    icon: z.string().optional(),//TODO should be enum with list of icon
    parent_id: z.coerce.number().nullable().default(null)
})


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

    const data = await categorie.list(filters)

    res.json({
        success: true,
        data,
    });
}


/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const createCategorie = async (req, res) => {
    const data = await categorie.create(dataSchema.parse(req.body))

    res.status(201).json({
        success: true,
        message: "Catégorie créée avec succès",
        data,
    });
}
/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
export const deleteCategorie = async (req, res) => {
    const { id } = req.params;
    const data = await categorie.remove(id)
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

    const data = categorie.update(id, dataSchema.parse(req.body))

    res.json({
        success: true,
        message: "Catégorie mise à jour avec succès",
        data,
    });
}

