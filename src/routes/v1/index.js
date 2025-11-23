import { Router } from "express";

export const router = Router();

router.use("/auth", (await import("../auth.js")).router);
router.use("/recycleries", (await import("./recycleries.js")).router);
router.use("/users", (await import("./users.js")).router);
router.use("/items", (await import("./items.js")).router);
router.use("/donations", (await import("./donations.js")).router);
router.use("/collections", (await import("./collections.js")).router);
router.use("/sales", (await import("./sales.js")).router);
router.use("/categories", (await import("./categories.js")).router);
router.use("/subcategories", (await import("./subcategories.js")).router);
router.use(
  "/collection-points",
  (await import("./collectionPoints.js")).router
);
router.use(
  "/collection-schedules",
  (await import("./collectionSchedules.js")).router
);
router.use("/arrivals", (await import("./arrivals.js")).router);
router.use("/labeled-items", (await import("./labeledItems.js")).router);
router.use('/stores', (await import("./store.js")).router);
router.use("/cash-sessions", (await import("./cashSessions.js")).router);
router.use("/cash-registers", (await import("./cash-register.js")).router);
router.use(
  "/sales-transactions",
  (await import("./salesTransactions.js")).router
);
router.use('/refunds', (await import("./refunds.js")).router);
router.use('/eco-organisms', (await import("./ecoOrganism.js")).router);
router.use('/waste-disposals', (await import("./wasteDisposals.js")).router);
router.use('/dashboard', (await import("./wasteDisposals.js")).router);
router.use('/tasks', (await import("./dashboard.js")).router);
// router.use('/planning', planningRoutes);
router.use('/store-hours', (await import("./storeHours.js")).router);
router.use('/store-locations', (await import("./storeLocation.js")).router);
router.use('/collection-point-presence', (await import("./collectionPoint_presences.js")).router);
router.use("/employee-stores", (await import("./employeeStore.js")).router);
router.use('/employee-workdays', (await import("./employeeWorkdays.js")).router);
