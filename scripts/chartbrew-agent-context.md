# Recyclerie MariaDB — agent query context

Use this file when generating **read-only MariaDB SQL** for Chartbrew (or any analytics AI) against database `recyclerie`.

## Rules

- Dialect: **MariaDB**. Quote mixed-case identifiers with backticks: `` `SalesTransactions` ``, `` `createdAt` ``, `` `transactionType` ``.
- **SELECT only.** Never INSERT, UPDATE, DELETE, DDL, or `INTO OUTFILE`.
- Never select `` `Users`.`password` `` (password hashes).
- Money is **EUR**, `DECIMAL(10,2)`. Wrap sums in `ROUND(..., 2)`.
- Timestamps are Sequelize `createdAt` / `updatedAt` (UTC). Civil months: `CAST(DATE_FORMAT(col, '%Y-%m-01') AS DATE)`.
- Prefer `status = 'completed'` on sales. Ignore `SequelizeMeta`.
- Chartbrew time series: one **DATE** column + one numeric metric. Alias clearly (`month`, `revenue`).

## Domain

A **recyclerie** is a thrift / reuse store (`` `Recycleries` ``). Each store has cash registers → cash sessions → sales.

| User phrase | Meaning | Table |
| --- | --- | --- |
| magasin, store, recyclerie | Physical store | `Recycleries` |
| caisse | Till / register | `CashRegisters` |
| session de caisse | Open/close till session | `CashSessions` |
| vente, CA, chiffre d'affaires, revenue | Net sales money | `SalesTransactions` |
| article, objet, labeled item | Priced inventory unit | `LabeledItems` |
| don | Incoming donation record | `Donations` |
| arrivage | Bulk inbound weight by category | `Arrivals` |
| point de collecte | Collection site | `CollectionPoints` |
| carte cadeau | Gift card | `GiftCards` |
| éco-organisme | Producer-responsibility org | `EcoOrganisms` |
| déchet, enfouissement | Outbound waste | `WasteDisposals` |
| salarié, employé (planning) | Staff for planning (not login users) | `Employees` |
| utilisateur, caissier | App login | `Users` |

`Employees` and `Users` are **different people tables**. POS cashiers are `Users`. Planning staff are `Employees`.

## Revenue (canonical)

`` `SalesTransactions`.`total_amount` `` is the amount after promotions.

- `transactionType = 'sell'` → **add** `total_amount`
- `transactionType = 'refund'` → **subtract** `total_amount` (stored positive)
- `status`: `pending` \| `completed` \| `cancelled` — use **`completed`**
- Refunds link to the original sale via `` `transactionId` ``
- `` `payment_amount` `` is cash tendered (may exceed total; change is virtual, not stored)
- Split tenders live in `` `transaction_payments` ``; header `` `payment_method` `` may be `mixed`

```sql
ROUND(SUM(CASE
  WHEN `transactionType` = 'refund' THEN -`total_amount`
  ELSE `total_amount`
END), 2)
```

Gift-card **issuance** is also a `sell` row (cash in). Paying later with a gift card is another `sell` of goods. Do not treat those as the same metric unless asked.

## Join path: store → sales

```
Recycleries.id
  → CashRegisters.recyclery_id
    → CashSessions.cash_register_id
      → SalesTransactions.cash_session_id
        → transaction_items.transaction_id
          → LabeledItems.id = labeled_item_id
            → Categories.id = LabeledItems.category_id
```

## Tables

### `Recycleries`
Stores. `id`, `name` (unique), `address`, `phone`, `email`, `city`, `postal_code`, `is_active`, `manager_id` → `Users.id`, `createdAt`, `updatedAt`.

### `CashRegisters`
`id`, `name`, `is_active`, `recyclery_id` → `Recycleries.id`. Unique (`recyclery_id`, `name`).

### `CashSessions`
`id`, `cash_register_id`, `user_id` → `Users.id`, `opening_amount`, `closing_amount`, `expected_amount`, `status` (`open` \| `close`), `notes`, `closed_at`, `createdAt`, `updatedAt`.

### `SalesTransactions`
`id`, `transactionId` (nullable FK to self, refund parent), `total_amount_before_promotion`, `total_amount`, `payment_method` (`cash` \| `card` \| `check` \| `giftcard` \| `mixed` \| `transfer`), `transactionType` (`sell` \| `refund`), `payment_amount`, `customer_name`, `customer_email`, `customer_postal_code`, `status` (`pending` \| `completed` \| `cancelled`), `cash_session_id`, `created_by` → `Users.id`, `createdAt`, `updatedAt`.

### `transaction_items`
Sale lines (composite PK). `transaction_id`, `labeled_item_id`, `name` (snapshot), `price` (unit snapshot), `quantity` (default 1), `promotionValue`, `bundleQuantity`, `bundlePrice`, `createdAt`, `updatedAt`.

Line total ≈ `price * quantity` minus item promotion; basket total is on the header.

### `transaction_payments`
`id`, `sales_transaction_id`, `method` (`cash` \| `card` \| `check` \| `giftcard` \| `transfer` — no `mixed`), `amount`, `gift_card_id` (nullable), `metadata` JSON, `createdAt`, `updatedAt`.

### `TransactionGlobalPromotions`
Whole-ticket promo. `id`, `value`, `type` (`percent` \| `fixed`), `transaction_id`.

### `LabeledItems`
`id`, `description`, `weight`, `price`, `cost`, `condition_state` (`excellent` \| `good` \| `fair` \| `poor`), `status` (`available` \| `sold`), `category_id`, `subcategory_id` (nullable, also → `Categories`), `recyclery_id`, `created_by`, `createdAt`, `updatedAt`.

`barcode` is **not** a column (virtual in the app). Stock on hand: `status = 'available'`. Sold count from inventory: `status = 'sold'`. Units sold from tickets: `SUM(transaction_items.quantity)` on completed sells.

### `Categories`
Tree: `parent_id` NULL = root, else subcategory. `id`, `name`, `description`, `icon`, `parent_id`, `defaultWeight`, `defaultPrice`, `IO` (bitmask), `priceBasedOnWeight`, `bundleQuantity`, `bundlePrice`, `createdAt`, `updatedAt`.

`IO` bits (column is named `IO`): **OUT = 1**, **IN = 2**, **SELL = 4**. Example: sellable categories `IO & 4 != 0`.

### `Users`
Logins. `id`, `username`, `email`, `password` (**forbidden**), `role` (`admin` \| `manager` \| `employee`), `phone`, `isActive`, `last_login`, `createdAt`, `updatedAt`. App auth uses this `role` enum, not table `Roles`.

### `Roles`
Legacy/unused for queries. Ignore unless asked.

### `GiftCards`
`id`, `code` (unique), `initial_value`, `expires_at`, `status` (`active` \| `partially_used` \| `redeemed` \| `expired` \| `cancelled`), `currency` (default `EUR`), `issued_at`, `issued_transaction_id`, `issued_refund_transaction_id`, `created_by`, `note`, `recipient_name`, `recipient_email`, `createdAt`, `updatedAt`.

**No `current_value` column.** Balance = `initial_value` + sum of `giftcard_transactions.amount` where `type <> 'issue'` (`charge` amounts are negative).

### `giftcard_transactions`
Composite PK (`gift_card_id`, `sales_transaction_id`). `type` (`issue` \| `charge` \| `refund_recredit` \| `manual_adjustment` \| `expire`), `amount` (signed, non-zero), `occurred_at`, `created_by`, `metadata` JSON, `createdAt`, `updatedAt`.

### `Donations`
`id`, `donor_name`, `donor_phone`, `donor_email`, `item_description`, `estimated_value`, `weight`, `status` (`pending` \| `accepted` \| `rejected`), `recyclery_id`, `received_by` → `Users.id`, `received_at`, `createdAt`, `updatedAt`.

### `Arrivals`
Inbound bulk (not individual labels). `id`, `weight`, `arrival_date`, `arrival_time`, `source_type` (`point` \| `apport` \| `house_clearance`), `source_details`, `notes`, `status` (`received` only), `category_id`, `subcategory_id`, `collection_point_id`, `processed_by` → `Users.id`, `createdAt`, `updatedAt`.

### `CollectionPoints`
`id`, `name` (unique), `address`, `city`, `postal_code`, `contact_person`, `contact_phone`, `contact_email`, `type` (`standard` \| `entreprise` \| `association` \| `school` \| `hospital` \| `other`), `notes`, `is_active`, `recyclery_id`, `createdAt`, `updatedAt`.

### `WasteDisposals`
`id`, `disposal_date`, `disposal_type` (`eco_organism` \| `landfill` \| `recycling` \| `other`), `weight_kg`, `volume_m3`, `transport_method`, `transport_company`, `transport_cost`, `notes`, `category_id`, `subcategory_id`, `eco_organism_id`, `created_by`, `createdAt`, `updatedAt`.

### `EcoOrganisms`
`id`, `name` (unique), `description`, `contact_email`, `contact_phone`, `address`, `website`, `is_active`, `createdAt`, `updatedAt`.

M2M: `ecoOrg_categoryIn` (`CategoryId`, `EcoOrganismId`), `ecoOrg_categorySell` (`CategoryId`, `EcoOrganismId`).

### `Promotions`
Category sale windows. `id`, `startDate`, `endDate` (DATEONLY, `endDate` nullable), `isActive`, `promotionValue`, `category_id`. Stores: `promotion_store` (`promotionId`, `storeId`).

### `Employees`
Planning staff. `id`, `nom`, `prenom`, `isActive`, `phone`, `email`, `createdAt`, `updatedAt`. Unique (`nom`, `prenom`).

### `employee_store`
`employeeId`, `recycleryId`, `is_primary`.

### `Skills` / `employee_skill`
Skills: `id`, `name`, `isActive`, `description`. M2M: `employee_skill` (`employeeId`, `skillId`).

### `EmployeeWorkdays`
Recurring availability. `id`, `day_of_week` (**0 = Sunday … 6 = Saturday**), `time_slot` (`morning` \| `afternoon` as string), `is_working`, `start_time`, `end_time`, `week` (`week1` \| `week2`), `notes`, `employee_id`.

### `EmployeeVacations`
`id`, `reason` (`paid_vacation` \| `sick` \| `other`), `start_date`, `end_date`, `notes`, `employee_id`.

### `TaskTemplates`
Blueprint. `id`, `name`, `description`, `category` (`vente` \| `point` \| `collection` \| `custom`), `scheduled_date`, `start_time`, `end_time` (TIME), `priority` (string, often `low` \| `medium` \| `high`), `status`, `notes`, `hourly_rate`, `required_skills`, `location`, `equipment_needed`.

### `TaskSchedules`
Recurring series. `id`, `store_id`, `collection_point_id`, `is_recurring`, `recurrence_pattern` (`daily` \| `weekly` \| `monthly`), plus same descriptive fields as templates, `scheduled_date` / `start_time` / `end_time` as DATETIME.

### `Tasks`
Concrete occurrences. `id`, `schedule_id`, `store_id`, `collection_point_id`, `name`, `description`, `category` (`vente` \| `point` \| `collection` \| `custom`), `priority`, `required_skills`, `location`, `equipment_needed`, `hourly_rate`, `scheduled_date`, `start_time`, `end_time`, `notes`, `status`, `createdAt`, `updatedAt`.

M2M: `employee_task` (`EmployeeId`, `TaskId`), `employee_schedule` (`EmployeeId`, `TaskScheduleId`).

## Example queries

Revenue per month:

```sql
SELECT
  CAST(DATE_FORMAT(st.`createdAt`, '%Y-%m-01') AS DATE) AS month,
  ROUND(SUM(CASE
    WHEN st.`transactionType` = 'refund' THEN -st.`total_amount`
    ELSE st.`total_amount`
  END), 2) AS revenue
FROM `SalesTransactions` st
WHERE st.`status` = 'completed'
GROUP BY DATE_FORMAT(st.`createdAt`, '%Y-%m-01')
ORDER BY month;
```

Revenue per store per month:

```sql
SELECT
  r.`name` AS store,
  CAST(DATE_FORMAT(st.`createdAt`, '%Y-%m-01') AS DATE) AS month,
  ROUND(SUM(CASE
    WHEN st.`transactionType` = 'refund' THEN -st.`total_amount`
    ELSE st.`total_amount`
  END), 2) AS revenue
FROM `SalesTransactions` st
JOIN `CashSessions` cs ON cs.id = st.`cash_session_id`
JOIN `CashRegisters` cr ON cr.id = cs.`cash_register_id`
JOIN `Recycleries` r ON r.id = cr.`recyclery_id`
WHERE st.`status` = 'completed'
GROUP BY r.id, r.`name`, DATE_FORMAT(st.`createdAt`, '%Y-%m-01')
ORDER BY month, store;
```

Units sold per category:

```sql
SELECT
  c.`name` AS category,
  SUM(ti.`quantity`) AS units_sold
FROM `transaction_items` ti
JOIN `SalesTransactions` st ON st.id = ti.`transaction_id`
JOIN `LabeledItems` li ON li.id = ti.`labeled_item_id`
JOIN `Categories` c ON c.id = li.`category_id`
WHERE st.`status` = 'completed'
  AND st.`transactionType` = 'sell'
GROUP BY c.id, c.`name`
ORDER BY units_sold DESC;
```

Payment mix (use payments table, not the header enum):

```sql
SELECT
  tp.`method`,
  ROUND(SUM(tp.`amount`), 2) AS paid
FROM `transaction_payments` tp
JOIN `SalesTransactions` st ON st.id = tp.`sales_transaction_id`
WHERE st.`status` = 'completed'
  AND st.`transactionType` = 'sell'
GROUP BY tp.`method`;
```

Gift-card remaining balance:

```sql
SELECT
  gc.`code`,
  gc.`status`,
  ROUND(
    gc.`initial_value` + COALESCE(SUM(
      CASE WHEN gt.`type` = 'issue' THEN 0 ELSE gt.`amount` END
    ), 0),
    2
  ) AS current_value
FROM `GiftCards` gc
LEFT JOIN `giftcard_transactions` gt ON gt.`gift_card_id` = gc.id
GROUP BY gc.id, gc.`code`, gc.`status`, gc.`initial_value`;
```

Available stock value per store:

```sql
SELECT
  r.`name` AS store,
  COUNT(*) AS items,
  ROUND(SUM(li.`price`), 2) AS catalog_value
FROM `LabeledItems` li
JOIN `Recycleries` r ON r.id = li.`recyclery_id`
WHERE li.`status` = 'available'
GROUP BY r.id, r.`name`;
```
