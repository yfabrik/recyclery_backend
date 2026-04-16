import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import db from "../models/index.js";

const { Arrival, Category, CollectionPoint, sequelize } = db;

const DEFAULT_OUTPUT_FILE = "arrivals.csv";
const outputArg = process.argv[2];
const outputPath = resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT_FILE);

const csvHeaders = [
  "id",
  "arrival_date",
  "arrival_time",
  "weight",
  "source_type",
  "source_details",
  "notes",
  "status",
  "category_id",
  "category_name",
  "subcategory_id",
  "subcategory_name",
  "collection_point_id",
  "collection_point_name",
  "processed_by",
  "created_at",
  "updated_at",
];

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const raw =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  if (
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r")
  ) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

try {
  const arrivals = await Arrival.findAll({
    include: [
      {
        model: Category,
        as: "categorie",
        required: false,
      },
      {
        model: Category,
        as: "subcategorie",
        required: false,
      },
      {
        model: CollectionPoint,
        required: false,
      },
    ],
    order: [["id", "ASC"]],
  });

  const csvRows = arrivals.map((arrival) => {
    const rowValues = [
      arrival.id,
      arrival.arrival_date.toLocaleString(),
      arrival.arrival_time,
      arrival.weight,
      arrival.source_type,
      arrival.source_details,
      arrival.notes,
      arrival.status,
      arrival.category_id,
      arrival.categorie?.name ?? "",
      arrival.subcategory_id,
      arrival.subcategorie?.name ?? "",
      arrival.collection_point_id,
      arrival.CollectionPoint?.name ?? "",
      arrival.processed_by,
      arrival.createdAt,
      arrival.updatedAt,
    ];

    return rowValues.map(escapeCsvValue).join(",");
  });

  const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
  await writeFile(outputPath, csvContent, "utf8");

  console.log(
    `Exported ${arrivals.length} arrivals to ${outputPath}`,
  );
} finally {
  await sequelize.close();
}