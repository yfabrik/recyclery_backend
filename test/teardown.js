export default async () => {
  try {
    const dbModule = await import("../src/models/index.ts");
    const db = dbModule.default ?? dbModule;
    // Close database connection only once at the very end of all tests
    if (db.sequelize) {
      await db.sequelize.close();
    }
  } catch (error) {
    throw error;
  }
};
