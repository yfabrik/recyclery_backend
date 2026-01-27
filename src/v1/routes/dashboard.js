
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import { dashboardActivities, dashboardCharts, dashboardStats, dashboardStoreStats } from "../controllers/dashboard.js";


export const router = Router();

// Route pour récupérer les statistiques du dashboard
router.get('/stats', authenticateToken, asyncHandler(dashboardStats))

// Route pour récupérer les activités récentes
router.get('/activities', authenticateToken, asyncHandler(dashboardActivities))

// Route pour récupérer les données de graphiques
router.get('/charts', authenticateToken, asyncHandler(dashboardCharts))



// Route pour récupérer les statistiques par magasin
router.get('/stores-stats', authenticateToken, asyncHandler(dashboardStoreStats))

