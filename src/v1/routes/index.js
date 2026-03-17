import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.js";
import { hasPermissions } from "../../middlewares/hasPermissions.js";

export const router = Router();

router.use("/auth", (await import("./auth.js")).router);

router.use(authenticateToken)
router.use(hasPermissions)

router.use("/recycleries", (await import("./recycleries.js")).router); //TODO store
router.use("/users", (await import("./users.js")).router);
// router.use("/items", (await import("./items.js")).router);
router.use("/donations", (await import("./donations.js")).router);
router.use("/collections", (await import("./collections.js")).router); //TODO change to tasks
router.use("/sales", (await import("./sales.js")).router);
router.use("/categories", (await import("./categories.js")).router);
// router.use("/subcategories", (await import("./subcategories.js")).router);
router.use(
  "/collection-points",
  (await import("./collectionPoints.js")).router,
);
router.use(
  "/collection-schedules",
  (await import("./collectionSchedules.js")).router, //todo change to task schedule
);
router.use("/arrivals", (await import("./arrivals.js")).router);
router.use("/labeled-items", (await import("./labeledItems.js")).router);
router.use("/stores", (await import("./store.js")).router);
router.use("/cash-sessions", (await import("./cashSessions.js")).router);
router.use("/cash-registers", (await import("./cash-register.js")).router);
router.use(
  "/sales-transactions",
  (await import("./salesTransactions.js")).router,
);
router.use("/refunds", (await import("./refunds.js")).router);
router.use("/eco-organisms", (await import("./ecoOrganism.js")).router);
router.use("/waste-disposals", (await import("./wasteDisposals.js")).router);
router.use("/dashboard", (await import("./dashboard.js")).router);
router.use("/tasks", (await import("./tasks.js")).router);
router.use("/planning", (await import("./planning.js")).router);
router.use("/store-hours", (await import("./storeHours.js")).router); //todo change to tasks schedule
router.use("/store-locations", (await import("./storeLocation.js")).router); //
router.use(
  "/collection-point-presence",
  (await import("./collectionPoint_presences.js")).router,
); // todo change to task schedule
router.use("/employee-stores", (await import("./employeeStore.js")).router);
router.use(
  "/employee-workdays",
  (await import("./employeeWorkdays.js")).router,
);

router.use("/employees", (await import("./employees.js")).router);
router.use("/promotions", (await import("./promotions.js")).router);
router.use("/skills", (await import("./skills.js")).router);


