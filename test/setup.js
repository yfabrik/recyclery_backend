const originalWarn = console.warn;
let db;

beforeAll(async () => {
  process.env.JWT_SECRET ??= "test-secret-key-for-jwt";
  process.env.TZ = "Europe/Paris";

  console.warn = (...args) => {
    const message = args.map((arg) => String(arg ?? "")).join(" ");
    if (
      message.includes(
        "SQLite does not support 'INTEGER' with UNSIGNED or ZEROFILL",
      )
    )
      return;
    if (message.includes("(sequelize) Warning")) return;
    originalWarn(...args);
  };

  db = (await import("../src/models/index")).default;
  await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  console.warn = originalWarn;
  await db.sequelize.close();
});
