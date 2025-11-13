import { Router } from "express";

export const router = Router();

router.use("/auth", (await import("../auth.js")).router);
router.use("/recycleries", (await import("./recycleries.js")).router);
router.use("/users", (await import("./users.js")).router);
router.use("/items", (await import("./items.js")).router);
// router.use('/donations', donationsRoutes);
// router.use('/collections', collectionsRoutes);
router.use("/sales", (await import("./sales.js")).router);
router.use("/categories", (await import("./categories.js")).router);
router.use("/subcategories", (await import("./subcategories.js")).router);
// router.use('/collection-points', collectionPointsRoutes);
// router.use('/collection-schedules', collectionSchedulesRoutes);
// router.use('/arrivals', arrivalsRoutes);
router.use("/labeled-items", (await import("./labeledItems.js")).router);
// router.use('/stores', storesRoutes);
router.use("/cash-sessions", (await import("./cashSessions.js")).router);
router.use("/cash-registers", (await import("./cash-register.js")).router);
router.use(
  "/sales-transactions",
  (await import("./salesTransactions.js")).router
);
// router.use('/refunds', refundsRoutes);
// router.use('/eco-organisms', ecoOrganismsRoutes);
// router.use('/waste-disposals', wasteDisposalsRoutes);
// router.use('/dashboard', dashboardRoutes);
// router.use('/tasks', tasksRoutes);
// router.use('/planning', planningRoutes);
// router.use('/store-hours', storeHoursRoutes);
// router.use('/store-locations', storeLocationsRoutes);
// router.use('/collection-point-presence', collectionPointPresenceRoutes);
router.use("/employee-stores", (await import("./employeeStore.js")).router);
// router.use('/employee-workdays', employeeWorkdaysRoutes);
