'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const fs = require('fs/promises');
    const path = require('path');

    const inputPath = path.resolve(__dirname, 'vente_fevrier.json');

    const raw = await fs.readFile(inputPath, 'utf8');
    /** @type {{category: string|null; subcategory: string|null; price: string|null; weight: string|null; quantity: string|null; store: string|null}[]} */
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length === 0) return;

    // Use compiled TS models from dist (src model loader expects a different export shape).
    const db = (await import('../../dist/models/index.js')).default;
    const {
      CashSession,
      CashRegister,
      Recyclery,
      Category,
      LabeledItem,
      TransactionPayment,
    } = db;

    /** @param {unknown} s */
    const normalizeWhitespace = (s) =>
      String(s ?? '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    /** @param {unknown} s */
    const normalizeMoneyFR = (s) => {
      const cleaned = normalizeWhitespace(s)
        .replace(/€/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '') // thousands separators (if any)
        .replace(',', '.');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    /** @param {unknown} s */
    const normalizeKgFR = (s) => {
      const cleaned = normalizeWhitespace(s)
        .replace(/kg/gi, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    /** @param {number} n @param {number} decimals */
    const roundTo = (n, decimals) => {
      const p = 10 ** decimals;
      return Math.round(n * p) / p;
    };

    /** @param {unknown} n */
    const toInt = (n) => {
      const num = typeof n === 'number' ? n : Number(n);
      if (!Number.isFinite(num)) return 0;
      const rounded = Math.round(num);
      // Allow common spreadsheet float noise.
      if (Math.abs(rounded - num) > 1e-6) return Math.floor(num);
      return rounded;
    };

    /** @param {number} n */
    const money2 = (n) => roundTo(n, 2);
    const baseDate = new Date('2026-02-10T08:00:00.000Z');
    let tsOffsetSeconds = 0;
    const nextTimestamp = () => {
      const d = new Date(baseDate);
      d.setUTCSeconds(d.getUTCSeconds() + tsOffsetSeconds);
      tsOffsetSeconds += 1;
      return d;
    };

    /** @param {unknown} name */
    const keyName = (name) => normalizeWhitespace(name).toUpperCase();
    /** @param {unknown} value */
    const normalizeUpper = (value) => normalizeWhitespace(value).toUpperCase();
    /** @param {unknown} name @param {number|null|undefined} parentId */
    const categoryKey = (name, parentId) =>
      `${keyName(name)}|${parentId ?? 'null'}`;

    /** @type {{id:number; name:string; parent_id:number|null; IO:number|null}[]} */
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'parent_id', 'IO'], where: { IO: db.Sequelize.literal(`Category.IO & ${1 << 2} != 0`) },
      raw: true,
    });

    const rootCategoryByName = new Map(
      categories
        .filter((c) => c.parent_id == null)
        .map((c) => [keyName(c.name), c]),
    );
    const subcategoryIdByNameAndParent = new Map(
      categories
        .filter((c) => c.parent_id != null)
        .map((c) => [categoryKey(c.name, c.parent_id), c.id]),
    );

    /** @type {{id:number; name:string}[]} */
    const stores = await Recyclery.findAll({
      attributes: ['id', 'name'],
      raw: true,
    });
    const storeByName = new Map(stores.map((s) => [keyName(s.name), s]));

    // Group by store so we can open one cash session per store
    // on that store's first cash register.
    const byStore = new Map();
    for (const [index, r] of rows.entries()) {
      const storeName = normalizeUpper(r.store);
      const storeKey = keyName(storeName);
      if (!byStore.has(storeKey)) byStore.set(storeKey, []);
      byStore.get(storeKey).push({ index, row: r, storeName });
    }

    let skippedZero = 0;
    let skippedIoMask = 0;
    let createdTx = 0;
    let nullSubcategories = 0;

    // Create everything inside a single transaction.
    await db.sequelize.transaction(async (outerT) => {
      for (const [storeKey, group] of byStore.entries()) {
        const store = storeByName.get(storeKey);
        if (!store) {
          throw new Error(`Store not found for name '${group[0]?.storeName ?? storeKey}'`);
        }

        const firstCashRegister = await CashRegister.findOne({
          where: { recyclery_id: store.id },
          order: [['id', 'ASC']],
          attributes: ['id'],
          transaction: outerT,
        });
        if (!firstCashRegister) {
          throw new Error(`No cash register found for store '${store.name}'`);
        }

        const cashSession = await CashSession.create(
          {
            cash_register_id: firstCashRegister.id,
            user_id: null,
            opening_amount: money2(0),
            status: 'open',
            notes: `Seed: vente_fevrier (${store.name})`,
            createdAt: nextTimestamp(),
            updatedAt: nextTimestamp(),
          },
          { transaction: outerT },
        );
        let storeSessionSalesTotal = 0;

        for (const { index, row: r } of group) {
          const categoryName = normalizeUpper(r.category);
          const subcategoryName = normalizeUpper(r.subcategory);
          const totalPrice = money2(normalizeMoneyFR(r.price));
          const totalWeight = roundTo(normalizeKgFR(r.weight), 2);
          const quantity = toInt(normalizeMoneyFR(r.quantity));

          if (!categoryName) {
            throw new Error(`Missing category at JSON row ${index}`);
          }
          if (quantity <= 0) {
            throw new Error(`Invalid quantity at JSON row ${index} (${r.quantity})`);
          }
          if (totalPrice <= 0) {
            skippedZero++;
            continue; // also avoids TransactionPayment min(0.01) validation
          }

          const category = rootCategoryByName.get(keyName(categoryName));
          if (!category) {
            throw new Error(`Category '${categoryName}' not found (row ${index})`);
          }

          
          let subId = null;
          if (subcategoryName) {
            const foundSubId = subcategoryIdByNameAndParent.get(
              categoryKey(subcategoryName, category.id),
            );
            if (foundSubId) {
              subId = foundSubId;
            } else {
              nullSubcategories++;
              console.log(
                `[venteFevrier seeder] subcategory not found, using null: category='${categoryName}', subcategory='${subcategoryName}', row=${index}`,
              );
            }
          }

          // The POS export gives total price + quantity.
          // We store the per-unit price in the transaction line (through.price) so totals remain consistent.
          const unitPrice = totalPrice / quantity;
          const unitPriceForLabel = money2(unitPrice); // LabeledItem.price is DECIMAL(10,2)
          const unitPriceForLine = String(unitPrice); // transaction_items.price is DECIMAL (no explicit scale)

          const labeledItem = await LabeledItem.create(
            {
              category_id: category.id,
              subcategory_id: subId,
              recyclery_id: store.id,
              weight: totalWeight,
              price: unitPriceForLabel,
              status: 'sold',
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
            },
            { transaction: outerT },
          );

          const sale = await cashSession.createSalesTransaction(
            {
              total_amount: totalPrice,
              payment_method: 'cash',
              payment_amount: totalPrice,
              transactionType: 'sell',
              customer_postal_code: null,
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
            },
            { transaction: outerT },
          );

          await queryInterface.bulkInsert(
            'transaction_items',
            [
              {
                transaction_id: sale.id,
                labeled_item_id: labeledItem.id,
                name: subcategoryName,
                price: unitPriceForLine,
                quantity,
                promotionValue: 0,
                bundleQuantity: null,
                bundlePrice: null,
                createdAt: nextTimestamp(),
                updatedAt: nextTimestamp(),
              },
            ],
            { transaction: outerT },
          );

          await TransactionPayment.create(
            {
              sales_transaction_id: sale.id,
              method: 'cash',
              amount: totalPrice,
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
            },
            { transaction: outerT },
          );

          storeSessionSalesTotal += totalPrice;
          createdTx++;
        }

        const closedAt = nextTimestamp();
        await cashSession.update(
          {
            status: 'close',
            expected_amount: money2(storeSessionSalesTotal),
            closing_amount: money2(storeSessionSalesTotal),
            closed_at: closedAt,
            updatedAt: closedAt,
          },
          { transaction: outerT },
        );
      }
    });

    console.log(
      `[venteFevrier seeder] created=${createdTx}, skipped_zero_price=${skippedZero}, skipped_io_mask=${skippedIoMask}, subcategory_set_null=${nullSubcategories}`,
    );
  },

  async down(queryInterface, Sequelize) {
    const start = new Date('2026-02-10T00:00:00.000Z');
    const end = new Date('2026-02-11T00:00:00.000Z');
    const whereByDay = {
      createdAt: {
        [Sequelize.Op.gte]: start,
        [Sequelize.Op.lt]: end,
      },
    };

    await queryInterface.bulkDelete('transaction_payments', whereByDay, {});
    await queryInterface.bulkDelete('transaction_items', whereByDay, {});
    await queryInterface.bulkDelete('SalesTransactions', whereByDay, {});
    await queryInterface.bulkDelete('LabeledItems', whereByDay, {});
    await queryInterface.bulkDelete('CashSessions', whereByDay, {});
  },
};
