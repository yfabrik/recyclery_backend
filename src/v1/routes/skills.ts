import { Router } from "express";
import {
  createSkill,
  deleteSkill,
  detailSkill,
  listSkills,
  updateSkill,
} from "../controllers/skills.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const router = Router();

// GET - Récupérer tous les magasins
router.get("/", asyncHandler(listSkills));

// GET - Récupérer un magasin par ID
router.get("/:id", asyncHandler(detailSkill));

// POST - Créer un nouveau magasin
router.post("/", asyncHandler(createSkill));

// PUT - Mettre à jour un magasin
router.put("/:id", asyncHandler(updateSkill));

// DELETE - Supprimer un magasin
router.delete("/:id", asyncHandler(deleteSkill));
