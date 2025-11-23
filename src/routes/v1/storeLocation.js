import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";

import { detailRecyclerie, listRecycleries } from "../../controllers/recycleries.js";
const { StoreLocation, Recyclery } = db;

export const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);



// GET /api/store-locations - Récupérer tous les lieux
router.get("/",
  asyncHandler(listRecycleries));

// GET /api/store-locations/:id - Récupérer un lieu par ID
router.get("/:id", asyncHandler(detailRecyclerie)
);

// POST /api/store-locations - Créer un nouveau lieu
router.post("/", asyncHandler(async (req, res) => {

  const { name, description, store_id, is_active } = req.body;

  // Validation des données
  if (!name || !store_id) {
    return res
      .status(400)
      .json({ message: "Le nom et le magasin sont requis" });
  }

  const location = await StoreLocation.create({
    name,
    description,
    store_id,
    is_active
  })


  res.status(201).json({
    message: "Lieu créé avec succès",
    location
  });

}))

// PUT /api/store-locations/:id - Mettre à jour un lieu
router.put("/:id", asyncHandler(async (req, res) => {

  const { id } = req.params;
  const { name, description, store_id, is_active } = req.body;

  // Validation des données
  if (!name || !store_id) {
    return res
      .status(400)
      .json({ message: "Le nom et le magasin sont requis" });
  }

  const updated = await StoreLocation.update({ name, description, store_id, is_active }, { where: { id } })

  if (updated === 0) {
    res.status(404).json({ message: "Lieu non trouvé" });
  } else {
    res.json({
      message: "Lieu mis à jour avec succès",
      location: {
        id: parseInt(id),
        name,
        description,
        store_id,
        is_active: is_active ? 1 : 0,
      },
    });
  }

}))

// DELETE /api/store-locations/:id - Supprimer un lieu
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleled = await StoreLocation.destroy({ where: { id } })

  if (deleled === 0) {
    res.status(404).json({ message: "Lieu non trouvé" });
  } else {
    res.json({ message: "Lieu supprimé avec succès" });
  }

}))

// GET /api/store-locations/store/:storeId - Récupérer les lieux d'un magasin spécifique
router.get("/store/:storeId", asyncHandler(async (req, res) => {
  const { storeId } = req.params;

  const locations = await StoreLocation.findAll({ where: { store_id: storeId }, include: [{ model: Recyclery }], order: [["name"]] })

  res.json({ locations });



}))
