/**
 * One-shot DB orphan repair.
 *
 * Dry-run (default): tsx src/scripts/repairDbOrphans.ts
 * Apply:             tsx src/scripts/repairDbOrphans.ts --apply
 *
 * Choose repairs (interactive menu if none of these flags):
 *   --cash-sessions       CashSessions.user_id from peer users on same register
 *   --sales-created-by    SalesTransactions.created_by from CashSessions.user_id
 *   --categories          Null/dangling category_id on items/arrivals/waste → archive
 *   --employee-task       Delete employee_task rows with missing Employee/Task
 *   --audit               Remaining-orphan report only (or after selected repairs)
 *   --all                 All repairs + audit
 *
 * Examples:
 *   tsx src/scripts/repairDbOrphans.ts --cash-sessions
 *   tsx src/scripts/repairDbOrphans.ts --apply --sales-created-by --categories
 *   tsx src/scripts/repairDbOrphans.ts --apply --employee-task
 *   tsx src/scripts/repairDbOrphans.ts --audit
 *
 * Does not invent LabeledItems.created_by or remap subcategory_id.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { QueryTypes, type Transaction } from "sequelize";
import db from "../models/index.js";

const APPLY = process.argv.includes("--apply");
const SAMPLE = 20;
const TRASH_NAME = "Archives (orphelins)";
const TRASH_DESCRIPTION =
  "Catégorie technique pour rattacher des enregistrements dont la catégorie d'origine a disparu (réparation orphelins).";

type IdRow = { id: number };
type CountRow = { c: number | string };
type PeerRow = {
  cash_register_id: number;
  user_id: number;
  cnt: number | string;
  last_at: Date | string;
};

const { sequelize } = db;

const isSqlite = () => sequelize.getDialect() === "sqlite";
const sqlNow = () => (isSqlite() ? `datetime('now')` : `NOW()`);

const q = async <T extends object>(
  sql: string,
  replacements?: Record<string, unknown>,
  transaction?: Transaction,
): Promise<T[]> =>
  sequelize.query<T>(sql, {
    type: QueryTypes.SELECT,
    replacements,
    transaction,
  });

const count = async (
  sql: string,
  replacements?: Record<string, unknown>,
  transaction?: Transaction,
): Promise<number> => {
  const rows = await q<CountRow>(sql, replacements, transaction);
  return Number(rows[0]?.c ?? 0);
};

const sampleIds = async (
  sql: string,
  replacements?: Record<string, unknown>,
  transaction?: Transaction,
): Promise<number[]> => {
  const rows = await q<IdRow>(`${sql} LIMIT ${SAMPLE}`, replacements, transaction);
  return rows.map((r) => r.id);
};

const logSection = (title: string) => {
  console.log(`\n=== ${title} ===`);
};

const logAudit = async (
  label: string,
  countSql: string,
  idSql: string,
  transaction?: Transaction,
) => {
  const n = await count(countSql, undefined, transaction);
  if (n === 0) {
    console.log(`  ${label}: 0`);
    return;
  }
  const ids = await sampleIds(idSql, undefined, transaction);
  console.log(`  ${label}: ${n} (sample ids: ${ids.join(", ")})`);
};

const brokenSessionWhere = `
  cs.user_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM Users u WHERE u.id = cs.user_id)
`;

const brokenCreatedByWhere = (alias: string, col: string) => `
  ${alias}.${col} IS NULL
  OR NOT EXISTS (SELECT 1 FROM Users u WHERE u.id = ${alias}.${col})
`;

const brokenCategoryIdWhere = (alias: string) => `
  ${alias}.category_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = ${alias}.category_id)
`;

const missingCategoryId = (table: string, alias: string) => `
  SELECT COUNT(*) AS c
  FROM \`${table}\` ${alias}
  WHERE ${brokenCategoryIdWhere(alias)}
`;

const missingCategoryIdIds = (table: string, alias: string) => `
  SELECT ${alias}.id AS id
  FROM \`${table}\` ${alias}
  WHERE ${brokenCategoryIdWhere(alias)}
  ORDER BY ${alias}.id
`;

async function pickPeerUsers(
  transaction?: Transaction,
): Promise<Map<number, number>> {
  const peers = await q<PeerRow>(
    `
    SELECT
      cs.cash_register_id AS cash_register_id,
      cs.user_id AS user_id,
      COUNT(*) AS cnt,
      MAX(cs.createdAt) AS last_at
    FROM CashSessions cs
    INNER JOIN Users u ON u.id = cs.user_id
    GROUP BY cs.cash_register_id, cs.user_id
    ORDER BY cs.cash_register_id, cnt DESC, last_at DESC
    `,
    undefined,
    transaction,
  );

  const best = new Map<number, number>();
  for (const row of peers) {
    if (!best.has(row.cash_register_id)) {
      best.set(row.cash_register_id, row.user_id);
    }
  }
  return best;
}

async function repairCashSessions(transaction?: Transaction) {
  logSection(`1. CashSessions.user_id ${APPLY ? "(APPLY)" : "(dry-run)"}`);

  const before = await count(
    `SELECT COUNT(*) AS c FROM CashSessions cs WHERE ${brokenSessionWhere}`,
    undefined,
    transaction,
  );
  const broken = await q<
    IdRow & { cash_register_id: number; user_id: number | null }
  >(
    `
    SELECT cs.id AS id, cs.cash_register_id AS cash_register_id, cs.user_id AS user_id
    FROM CashSessions cs
    WHERE ${brokenSessionWhere}
    ORDER BY cs.id
    `,
    undefined,
    transaction,
  );

  console.log(`  broken before: ${before}`);
  if (broken.length === 0) return;

  const peers = await pickPeerUsers(transaction);
  const unmapped: number[] = [];
  let updated = 0;

  for (const session of broken) {
    const peer = peers.get(session.cash_register_id);
    if (peer == null) {
      unmapped.push(session.id);
      continue;
    }
    if (APPLY) {
      await sequelize.query(
        `UPDATE CashSessions SET user_id = :userId, updatedAt = ${sqlNow()} WHERE id = :id`,
        {
          replacements: { userId: peer, id: session.id },
          transaction,
        },
      );
    }
    updated += 1;
    console.log(
      `  session ${session.id} (register ${session.cash_register_id}): ${session.user_id} → ${peer}`,
    );
  }

  if (unmapped.length) {
    console.log(
      `  no peer user on register (left unchanged): ${unmapped.join(", ")}`,
    );
  }
  console.log(`  would/did update: ${updated}`);
}

async function repairSalesCreatedBy(transaction?: Transaction) {
  logSection(
    `2. SalesTransactions.created_by ${APPLY ? "(APPLY)" : "(dry-run)"}`,
  );

  const before = await count(
    `
    SELECT COUNT(*) AS c
    FROM SalesTransactions st
    WHERE ${brokenCreatedByWhere("st", "created_by")}
    `,
    undefined,
    transaction,
  );
  console.log(`  broken before: ${before}`);

  // In dry-run, also count sales whose session would get a peer user in step 1.
  const peers = await pickPeerUsers(transaction);
  const peerRegisterIds = [...peers.keys()];
  const fixable = await count(
    `
    SELECT COUNT(*) AS c
    FROM SalesTransactions st
    INNER JOIN CashSessions cs ON cs.id = st.cash_session_id
    WHERE ${brokenCreatedByWhere("st", "created_by")}
      AND (
        EXISTS (SELECT 1 FROM Users u WHERE u.id = cs.user_id)
        OR (
          (${brokenSessionWhere})
          AND cs.cash_register_id IN (:peerRegisterIds)
        )
      )
    `,
    {
      peerRegisterIds: peerRegisterIds.length ? peerRegisterIds : [-1],
    },
    transaction,
  );
  console.log(`  fixable from session.user_id (incl. peer remap): ${fixable}`);

  if (APPLY && before > 0) {
    await sequelize.query(
      `
      UPDATE SalesTransactions st
      INNER JOIN CashSessions cs ON cs.id = st.cash_session_id
      INNER JOIN Users u ON u.id = cs.user_id
      SET st.created_by = cs.user_id, st.updatedAt = ${sqlNow()}
      WHERE ${brokenCreatedByWhere("st", "created_by")}
      `,
      { transaction },
    );
  }

  const after = APPLY
    ? await count(
        `
        SELECT COUNT(*) AS c
        FROM SalesTransactions st
        WHERE ${brokenCreatedByWhere("st", "created_by")}
        `,
        undefined,
        transaction,
      )
    : before - fixable;
  console.log(`  broken after (est. if dry-run): ${Math.max(0, after)}`);
}

async function ensureTrashCategory(
  transaction?: Transaction,
): Promise<number> {
  const existing = await q<IdRow>(
    `
    SELECT id FROM Categories
    WHERE name = :name AND parent_id IS NULL
    LIMIT 1
    `,
    { name: TRASH_NAME },
    transaction,
  );
  if (existing[0]?.id != null) {
    console.log(`  trash category already exists: id=${existing[0].id}`);
    return existing[0].id;
  }

  if (!APPLY) {
    console.log(`  would create trash category "${TRASH_NAME}"`);
    return -1;
  }

  await sequelize.query(
    `
    INSERT INTO Categories
      (name, description, icon, defaultWeight, defaultPrice, IO, priceBasedOnWeight,
       bundleQuantity, bundlePrice, parent_id, createdAt, updatedAt)
    VALUES
      (:name, :description, NULL, 0, 0, 0, 0, NULL, NULL, NULL, ${sqlNow()}, ${sqlNow()})
    `,
    {
      replacements: { name: TRASH_NAME, description: TRASH_DESCRIPTION },
      transaction,
    },
  );
  const created = await q<IdRow>(
    `
    SELECT id FROM Categories
    WHERE name = :name AND parent_id IS NULL
    ORDER BY id DESC
    LIMIT 1
    `,
    { name: TRASH_NAME },
    transaction,
  );
  const id = created[0]?.id;
  if (id == null) throw new Error("failed to create trash category");
  console.log(`  created trash category: id=${id}`);
  return id;
}

async function remapCategoryId(
  table: string,
  trashId: number,
  transaction?: Transaction,
) {
  const before = await count(missingCategoryId(table, "t"), undefined, transaction);
  const ids = await sampleIds(missingCategoryIdIds(table, "t"), undefined, transaction);
  console.log(
    `  ${table}.category_id null/dangling: ${before}` +
      (ids.length ? ` (sample: ${ids.join(", ")})` : ""),
  );

  if (before === 0) return;
  if (!APPLY) {
    console.log(
      `  would bind ${before} row(s) → archive ${trashId === -1 ? "(new)" : trashId}`,
    );
    return;
  }
  if (trashId < 0) throw new Error("trash category id required to apply");

  // SQLite-friendly UPDATE (no MySQL-style table alias in SET).
  // NULL category_id never matches Categories.id, so NOT EXISTS covers null + dangling.
  await sequelize.query(
    `
    UPDATE \`${table}\`
    SET category_id = :trashId, updatedAt = ${sqlNow()}
    WHERE category_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = category_id)
    `,
    { replacements: { trashId }, transaction },
  );
  console.log(`  bound ${before} row(s) → archive ${trashId}`);
}

async function tableExists(
  table: string,
  transaction?: Transaction,
): Promise<boolean> {
  if (isSqlite()) {
    const rows = await q<{ name: string }>(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = :table
      `,
      { table },
      transaction,
    );
    return rows.length > 0;
  }

  const rows = await q<{ t: string }>(
    `
    SELECT TABLE_NAME AS t
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table
    `,
    { table },
    transaction,
  );
  return rows.length > 0;
}

async function cleanupEcoOrgJoins(transaction?: Transaction) {
  for (const table of ["ecoOrg_categoryIn", "ecoOrg_categorySell"] as const) {
    if (!(await tableExists(table, transaction))) {
      console.log(`  ${table}: table missing, skip`);
      continue;
    }

    const n = await count(
      `
      SELECT COUNT(*) AS c
      FROM \`${table}\` j
      WHERE NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = j.CategoryId)
      `,
      undefined,
      transaction,
    );
    console.log(`  ${table} dangling CategoryId: ${n}`);
    if (APPLY && n > 0) {
      const deleteSql = isSqlite()
        ? `
        DELETE FROM \`${table}\`
        WHERE NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = CategoryId)
        `
        : `
        DELETE j FROM \`${table}\` j
        WHERE NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = j.CategoryId)
        `;
      await sequelize.query(deleteSql, { transaction });
      console.log(`  deleted ${n} dangling join row(s) from ${table}`);
    }
  }
}

async function repairCategories(transaction?: Transaction) {
  logSection(
    `4. Null/dangling category_id → archive ${APPLY ? "(APPLY)" : "(dry-run)"}`,
  );
  const trashId = await ensureTrashCategory(transaction);
  for (const table of [
    "LabeledItems",
    "Arrivals",
    "WasteDisposals",
  ] as const) {
    await remapCategoryId(table, trashId, transaction);
  }
  await cleanupEcoOrgJoins(transaction);
}

const brokenEmployeeTaskWhere = `
  NOT EXISTS (SELECT 1 FROM Employees e WHERE e.id = et.EmployeeId)
  OR NOT EXISTS (SELECT 1 FROM Tasks t WHERE t.id = et.TaskId)
`;

async function repairEmployeeTask(transaction?: Transaction) {
  logSection(
    `5. Invalid employee_task rows → delete ${APPLY ? "(APPLY)" : "(dry-run)"}`,
  );

  if (!(await tableExists("employee_task", transaction))) {
    console.log("  employee_task: table missing, skip");
    return;
  }

  const before = await count(
    `
    SELECT COUNT(*) AS c
    FROM employee_task et
    WHERE ${brokenEmployeeTaskWhere}
    `,
    undefined,
    transaction,
  );

  const samples = await q<{ EmployeeId: number; TaskId: number }>(
    `
    SELECT et.EmployeeId AS EmployeeId, et.TaskId AS TaskId
    FROM employee_task et
    WHERE ${brokenEmployeeTaskWhere}
    ORDER BY et.EmployeeId, et.TaskId
    LIMIT ${SAMPLE}
    `,
    undefined,
    transaction,
  );

  console.log(
    `  employee_task dangling EmployeeId/TaskId: ${before}` +
      (samples.length
        ? ` (sample: ${samples
            .map((r) => `${r.EmployeeId}/${r.TaskId}`)
            .join(", ")})`
        : ""),
  );

  if (before === 0) return;
  if (!APPLY) {
    console.log(`  would delete ${before} join row(s)`);
    return;
  }

  const deleteSql = isSqlite()
    ? `
      DELETE FROM employee_task
      WHERE NOT EXISTS (SELECT 1 FROM Employees e WHERE e.id = EmployeeId)
         OR NOT EXISTS (SELECT 1 FROM Tasks t WHERE t.id = TaskId)
      `
    : `
      DELETE et FROM employee_task et
      WHERE NOT EXISTS (SELECT 1 FROM Employees e WHERE e.id = et.EmployeeId)
         OR NOT EXISTS (SELECT 1 FROM Tasks t WHERE t.id = et.TaskId)
      `;
  await sequelize.query(deleteSql, { transaction });
  console.log(`  deleted ${before} invalid employee_task row(s)`);
}

async function auditReport(transaction?: Transaction) {
  logSection("6. Audit (report-only)");

  console.log("\n  -- LabeledItems.created_by (left null by design) --");
  await logAudit(
    "LabeledItems.created_by null/dangling",
    `
    SELECT COUNT(*) AS c FROM LabeledItems li
    WHERE ${brokenCreatedByWhere("li", "created_by")}
    `,
    `
    SELECT li.id AS id FROM LabeledItems li
    WHERE ${brokenCreatedByWhere("li", "created_by")}
    ORDER BY li.id
    `,
    transaction,
  );

  console.log("\n  -- Remaining session / sales --");
  await logAudit(
    "CashSessions.user_id still broken",
    `SELECT COUNT(*) AS c FROM CashSessions cs WHERE ${brokenSessionWhere}`,
    `SELECT cs.id AS id FROM CashSessions cs WHERE ${brokenSessionWhere} ORDER BY cs.id`,
    transaction,
  );
  await logAudit(
    "SalesTransactions.created_by still broken",
    `
    SELECT COUNT(*) AS c FROM SalesTransactions st
    WHERE ${brokenCreatedByWhere("st", "created_by")}
    `,
    `
    SELECT st.id AS id FROM SalesTransactions st
    WHERE ${brokenCreatedByWhere("st", "created_by")}
    ORDER BY st.id
    `,
    transaction,
  );

  console.log("\n  -- Subcategory orphans (not auto-fixed) --");
  for (const table of ["LabeledItems", "Arrivals", "WasteDisposals"] as const) {
    await logAudit(
      `${table}.subcategory_id dangling`,
      `
      SELECT COUNT(*) AS c FROM \`${table}\` t
      WHERE t.subcategory_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = t.subcategory_id)
      `,
      `
      SELECT t.id AS id FROM \`${table}\` t
      WHERE t.subcategory_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM Categories c WHERE c.id = t.subcategory_id)
      ORDER BY t.id
      `,
      transaction,
    );
  }

  console.log("\n  -- Other audit users --");
  const userAudits: Array<[string, string, string]> = [
    ["Arrivals", "processed_by", "Arrivals"],
    ["WasteDisposals", "created_by", "WasteDisposals"],
    ["Donations", "received_by", "Donations"],
    ["GiftCards", "created_by", "GiftCards"],
  ];
  for (const [table, col, label] of userAudits) {
    await logAudit(
      `${label}.${col} null/dangling`,
      `
      SELECT COUNT(*) AS c FROM \`${table}\` t
      WHERE ${brokenCreatedByWhere("t", col)}
      `,
      `
      SELECT t.id AS id FROM \`${table}\` t
      WHERE ${brokenCreatedByWhere("t", col)}
      ORDER BY t.id
      `,
      transaction,
    );
  }
  {
    const n = await count(
      `
      SELECT COUNT(*) AS c FROM giftcard_transactions t
      WHERE ${brokenCreatedByWhere("t", "created_by")}
      `,
      undefined,
      transaction,
    );
    if (n === 0) {
      console.log("  giftcard_transactions.created_by null/dangling: 0");
    } else {
      const samples = await q<{
        gift_card_id: number;
        sales_transaction_id: number;
      }>(
        `
        SELECT t.gift_card_id AS gift_card_id, t.sales_transaction_id AS sales_transaction_id
        FROM giftcard_transactions t
        WHERE ${brokenCreatedByWhere("t", "created_by")}
        ORDER BY t.gift_card_id, t.sales_transaction_id
        LIMIT ${SAMPLE}
        `,
        undefined,
        transaction,
      );
      console.log(
        `  giftcard_transactions.created_by null/dangling: ${n} (sample: ${samples
          .map((r) => `${r.gift_card_id}/${r.sales_transaction_id}`)
          .join(", ")})`,
      );
    }
  }

  console.log("\n  -- Store / register / session links --");
  await logAudit(
    "CashSessions.cash_register_id missing register",
    `
    SELECT COUNT(*) AS c FROM CashSessions cs
    WHERE NOT EXISTS (SELECT 1 FROM CashRegisters cr WHERE cr.id = cs.cash_register_id)
    `,
    `
    SELECT cs.id AS id FROM CashSessions cs
    WHERE NOT EXISTS (SELECT 1 FROM CashRegisters cr WHERE cr.id = cs.cash_register_id)
    ORDER BY cs.id
    `,
    transaction,
  );
  await logAudit(
    "SalesTransactions.cash_session_id missing session",
    `
    SELECT COUNT(*) AS c FROM SalesTransactions st
    WHERE st.cash_session_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CashSessions cs WHERE cs.id = st.cash_session_id)
    `,
    `
    SELECT st.id AS id FROM SalesTransactions st
    WHERE st.cash_session_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CashSessions cs WHERE cs.id = st.cash_session_id)
    ORDER BY st.id
    `,
    transaction,
  );
  await logAudit(
    "CashRegisters.recyclery_id missing store",
    `
    SELECT COUNT(*) AS c FROM CashRegisters cr
    WHERE NOT EXISTS (SELECT 1 FROM Recycleries r WHERE r.id = cr.recyclery_id)
    `,
    `
    SELECT cr.id AS id FROM CashRegisters cr
    WHERE NOT EXISTS (SELECT 1 FROM Recycleries r WHERE r.id = cr.recyclery_id)
    ORDER BY cr.id
    `,
    transaction,
  );
  await logAudit(
    "LabeledItems.recyclery_id dangling (when set)",
    `
    SELECT COUNT(*) AS c FROM LabeledItems li
    WHERE li.recyclery_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Recycleries r WHERE r.id = li.recyclery_id)
    `,
    `
    SELECT li.id AS id FROM LabeledItems li
    WHERE li.recyclery_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Recycleries r WHERE r.id = li.recyclery_id)
    ORDER BY li.id
    `,
    transaction,
  );
  await logAudit(
    "Donations.recyclery_id dangling (when set)",
    `
    SELECT COUNT(*) AS c FROM Donations d
    WHERE d.recyclery_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Recycleries r WHERE r.id = d.recyclery_id)
    `,
    `
    SELECT d.id AS id FROM Donations d
    WHERE d.recyclery_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Recycleries r WHERE r.id = d.recyclery_id)
    ORDER BY d.id
    `,
    transaction,
  );
  await logAudit(
    "Recycleries.manager_id dangling (null OK)",
    `
    SELECT COUNT(*) AS c FROM Recycleries r
    WHERE r.manager_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Users u WHERE u.id = r.manager_id)
    `,
    `
    SELECT r.id AS id FROM Recycleries r
    WHERE r.manager_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Users u WHERE u.id = r.manager_id)
    ORDER BY r.id
    `,
    transaction,
  );

  console.log("\n  -- Other refs --");
  await logAudit(
    "Categories.parent_id dangling",
    `
    SELECT COUNT(*) AS c FROM Categories c
    WHERE c.parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Categories p WHERE p.id = c.parent_id)
    `,
    `
    SELECT c.id AS id FROM Categories c
    WHERE c.parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM Categories p WHERE p.id = c.parent_id)
    ORDER BY c.id
    `,
    transaction,
  );
  await logAudit(
    "Arrivals.collection_point_id dangling",
    `
    SELECT COUNT(*) AS c FROM Arrivals a
    WHERE a.collection_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CollectionPoints cp WHERE cp.id = a.collection_point_id)
    `,
    `
    SELECT a.id AS id FROM Arrivals a
    WHERE a.collection_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CollectionPoints cp WHERE cp.id = a.collection_point_id)
    ORDER BY a.id
    `,
    transaction,
  );
  await logAudit(
    "Tasks.collection_point_id dangling",
    `
    SELECT COUNT(*) AS c FROM Tasks t
    WHERE t.collection_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CollectionPoints cp WHERE cp.id = t.collection_point_id)
    `,
    `
    SELECT t.id AS id FROM Tasks t
    WHERE t.collection_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CollectionPoints cp WHERE cp.id = t.collection_point_id)
    ORDER BY t.id
    `,
    transaction,
  );
  await logAudit(
    "TaskSchedules.collection_point_id dangling",
    `
    SELECT COUNT(*) AS c FROM TaskSchedules ts
    WHERE ts.collection_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CollectionPoints cp WHERE cp.id = ts.collection_point_id)
    `,
    `
    SELECT ts.id AS id FROM TaskSchedules ts
    WHERE ts.collection_point_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM CollectionPoints cp WHERE cp.id = ts.collection_point_id)
    ORDER BY ts.id
    `,
    transaction,
  );
  await logAudit(
    "transaction_items.labeled_item_id missing item",
    `
    SELECT COUNT(*) AS c FROM transaction_items ti
    WHERE NOT EXISTS (SELECT 1 FROM LabeledItems li WHERE li.id = ti.labeled_item_id)
    `,
    `
    SELECT ti.id AS id FROM transaction_items ti
    WHERE NOT EXISTS (SELECT 1 FROM LabeledItems li WHERE li.id = ti.labeled_item_id)
    ORDER BY ti.id
    `,
    transaction,
  );
  await logAudit(
    "transaction_payments.gift_card_id dangling",
    `
    SELECT COUNT(*) AS c FROM transaction_payments tp
    WHERE tp.gift_card_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM GiftCards g WHERE g.id = tp.gift_card_id)
    `,
    `
    SELECT tp.id AS id FROM transaction_payments tp
    WHERE tp.gift_card_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM GiftCards g WHERE g.id = tp.gift_card_id)
    ORDER BY tp.id
    `,
    transaction,
  );
  await logAudit(
    "GiftCards.issued_transaction_id dangling",
    `
    SELECT COUNT(*) AS c FROM GiftCards g
    WHERE g.issued_transaction_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM SalesTransactions st WHERE st.id = g.issued_transaction_id)
    `,
    `
    SELECT g.id AS id FROM GiftCards g
    WHERE g.issued_transaction_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM SalesTransactions st WHERE st.id = g.issued_transaction_id)
    ORDER BY g.id
    `,
    transaction,
  );
  await logAudit(
    "GiftCards.issued_refund_transaction_id dangling",
    `
    SELECT COUNT(*) AS c FROM GiftCards g
    WHERE g.issued_refund_transaction_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM SalesTransactions st WHERE st.id = g.issued_refund_transaction_id)
    `,
    `
    SELECT g.id AS id FROM GiftCards g
    WHERE g.issued_refund_transaction_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM SalesTransactions st WHERE st.id = g.issued_refund_transaction_id)
    ORDER BY g.id
    `,
    transaction,
  );

  console.log("\n  -- employee_task join orphans --");
  {
    const n = await count(
      `
      SELECT COUNT(*) AS c FROM employee_task et
      WHERE ${brokenEmployeeTaskWhere}
      `,
      undefined,
      transaction,
    );
    if (n === 0) {
      console.log("  employee_task dangling EmployeeId/TaskId: 0");
    } else {
      const samples = await q<{ EmployeeId: number; TaskId: number }>(
        `
        SELECT et.EmployeeId AS EmployeeId, et.TaskId AS TaskId
        FROM employee_task et
        WHERE ${brokenEmployeeTaskWhere}
        ORDER BY et.EmployeeId, et.TaskId
        LIMIT ${SAMPLE}
        `,
        undefined,
        transaction,
      );
      console.log(
        `  employee_task dangling EmployeeId/TaskId: ${n} (sample: ${samples
          .map((r) => `${r.EmployeeId}/${r.TaskId}`)
          .join(", ")})`,
      );
    }
  }

  console.log("\n  -- category_id still null/dangling (should be 0 after apply) --");
  for (const table of [
    "LabeledItems",
    "Arrivals",
    "WasteDisposals",
    "Promotions",
  ] as const) {
    await logAudit(
      `${table}.category_id still null/dangling`,
      missingCategoryId(table, "t"),
      missingCategoryIdIds(table, "t"),
      transaction,
    );
  }
}

type RepairKey =
  | "cash-sessions"
  | "sales-created-by"
  | "categories"
  | "employee-task"
  | "audit";

const REPAIR_FLAGS: Record<Exclude<RepairKey, "audit">, string> = {
  "cash-sessions": "--cash-sessions",
  "sales-created-by": "--sales-created-by",
  categories: "--categories",
  "employee-task": "--employee-task",
};

const REPAIR_LABELS: Record<RepairKey, string> = {
  "cash-sessions":
    "CashSessions.user_id from most frequent peer user on same cash register",
  "sales-created-by":
    "SalesTransactions.created_by from CashSessions.user_id",
  categories:
    "Null/dangling category_id on items/arrivals/waste → archive category",
  "employee-task":
    "Delete employee_task rows with missing Employee or Task",
  audit: "Remaining / other orphans report",
};

const parseRepairSelectionFromArgv = (): RepairKey[] | null => {
  const argv = process.argv.slice(2);
  if (argv.includes("--all")) {
    return [
      "cash-sessions",
      "sales-created-by",
      "categories",
      "employee-task",
      "audit",
    ];
  }

  const selected: RepairKey[] = [];
  for (const [key, flag] of Object.entries(REPAIR_FLAGS) as [
    Exclude<RepairKey, "audit">,
    string,
  ][]) {
    if (argv.includes(flag)) selected.push(key);
  }
  if (argv.includes("--audit")) selected.push("audit");

  return selected.length > 0 ? selected : null;
};

const promptRepairSelection = async (): Promise<RepairKey[]> => {
  const options: RepairKey[] = [
    "cash-sessions",
    "sales-created-by",
    "categories",
    "employee-task",
    "audit",
  ];

  console.log("\nSelect repair(s) to run:");
  options.forEach((key, i) => {
    console.log(`  ${i + 1}) ${REPAIR_LABELS[key]}`);
  });
  console.log("  a) all");
  console.log("  q) quit");

  const rl = createInterface({ input, output });
  try {
    const answer = (
      await rl.question("\nChoice (e.g. 1, 1 3, a): ")
    )
      .trim()
      .toLowerCase();

    if (answer === "" || answer === "q" || answer === "quit") {
      console.log("Cancelled.");
      process.exit(0);
    }
    if (answer === "a" || answer === "all") {
      return options;
    }

    const tokens = answer.split(/[\s,]+/).filter(Boolean);
    const selected: RepairKey[] = [];
    for (const token of tokens) {
      const n = Number(token);
      if (!Number.isInteger(n) || n < 1 || n > options.length) {
        throw new Error(
          `Invalid choice "${token}". Use numbers 1-${options.length}, a, or q.`,
        );
      }
      const key = options[n - 1]!;
      if (!selected.includes(key)) selected.push(key);
    }
    if (selected.length === 0) {
      throw new Error("No repair selected.");
    }
    return selected;
  } finally {
    rl.close();
  }
};

const runSelectedRepairs = async (
  selected: RepairKey[],
  transaction?: Transaction,
) => {
  const run = new Set(selected);
  if (run.has("cash-sessions")) await repairCashSessions(transaction);
  if (run.has("sales-created-by")) await repairSalesCreatedBy(transaction);
  if (run.has("categories")) await repairCategories(transaction);
  if (run.has("employee-task")) await repairEmployeeTask(transaction);
  if (run.has("audit")) await auditReport(transaction);
};

async function main() {
  console.log(
    APPLY
      ? "Mode: APPLY (writes will be committed)"
      : "Mode: DRY-RUN (no writes). Pass --apply to write.",
  );

  const selected =
    parseRepairSelectionFromArgv() ?? (await promptRepairSelection());

  console.log("\nSelected:");
  for (const key of selected) {
    console.log(`  - ${REPAIR_LABELS[key]}`);
  }

  await sequelize.authenticate();

  const writes = selected.some((k) => k !== "audit");
  if (APPLY && writes) {
    await sequelize.transaction(async (transaction) => {
      await runSelectedRepairs(selected, transaction);
    });
  } else {
    await runSelectedRepairs(selected);
  }

  console.log("\nDone.");
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
