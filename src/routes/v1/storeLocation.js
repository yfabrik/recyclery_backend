import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { Op, where } from "sequelize";
import salestransaction from "../../models/salestransaction.js";
const { LabeledItem, Category, User, SalesTransaction, Store, Refund } = db;

export const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// Créer la table store_locations si elle n'existe pas
const initStoreLocationsTable = () => {
  const db = new sqlite3.Database(dbPath);

  db.run(
    `
    CREATE TABLE IF NOT EXISTS store_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      store_id INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores (id)
    )
  `,
    (err) => {
      if (err) {
        console.error(
          "Erreur lors de la création de la table store_locations:",
          err
        );
      } else {
        console.log("Table store_locations initialisée");
      }
    }
  );

  db.close();
};

// Initialiser la table au démarrage
initStoreLocationsTable();

// GET /api/store-locations - Récupérer tous les lieux
router.get("/", (req, res) => {
  const db = new sqlite3.Database(dbPath);

  const query = `
    SELECT 
      sl.*,
      s.name as store_name
    FROM store_locations sl
    LEFT JOIN stores s ON sl.store_id = s.id
    ORDER BY sl.name
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Erreur lors de la récupération des lieux:", err);
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération des lieux" });
    } else {
      res.json({ locations: rows });
    }
    db.close();
  });
});

// GET /api/store-locations/:id - Récupérer un lieu par ID
router.get("/:id", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;

  const query = `
    SELECT 
      sl.*,
      s.name as store_name
    FROM store_locations sl
    LEFT JOIN stores s ON sl.store_id = s.id
    WHERE sl.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error("Erreur lors de la récupération du lieu:", err);
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération du lieu" });
    } else if (!row) {
      res.status(404).json({ message: "Lieu non trouvé" });
    } else {
      res.json({ location: row });
    }
    db.close();
  });
});

// POST /api/store-locations - Créer un nouveau lieu
router.post("/", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { name, description, store_id, is_active } = req.body;

  // Validation des données
  if (!name || !store_id) {
    return res
      .status(400)
      .json({ message: "Le nom et le magasin sont requis" });
  }

  const query = `
    INSERT INTO store_locations (name, description, store_id, is_active)
    VALUES (?, ?, ?, ?)
  `;

  db.run(
    query,
    [name, description || "", store_id, is_active ? 1 : 0],
    function (err) {
      if (err) {
        console.error("Erreur lors de la création du lieu:", err);
        res.status(500).json({ message: "Erreur lors de la création du lieu" });
      } else {
        res.status(201).json({
          message: "Lieu créé avec succès",
          location: {
            id: this.lastID,
            name,
            description,
            store_id,
            is_active: is_active ? 1 : 0,
          },
        });
      }
      db.close();
    }
  );
});

// PUT /api/store-locations/:id - Mettre à jour un lieu
router.put("/:id", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;
  const { name, description, store_id, is_active } = req.body;

  // Validation des données
  if (!name || !store_id) {
    return res
      .status(400)
      .json({ message: "Le nom et le magasin sont requis" });
  }

  const query = `
    UPDATE store_locations 
    SET name = ?, description = ?, store_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    query,
    [name, description || "", store_id, is_active ? 1 : 0, id],
    function (err) {
      if (err) {
        console.error("Erreur lors de la mise à jour du lieu:", err);
        res
          .status(500)
          .json({ message: "Erreur lors de la mise à jour du lieu" });
      } else if (this.changes === 0) {
        res.status(404).json({ message: "Lieu non trouvé" });
      } else {
        res.json({
          message: "Lieu mis à jour avec succès",
          location: {
            id: parseInt(id),
            name,
            description,
            store_id,
            is_active: is_active ? 1 : 0,
          },
        });
      }
      db.close();
    }
  );
});

// DELETE /api/store-locations/:id - Supprimer un lieu
router.delete("/:id", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;

  const query = "DELETE FROM store_locations WHERE id = ?";

  db.run(query, [id], function (err) {
    if (err) {
      console.error("Erreur lors de la suppression du lieu:", err);
      res
        .status(500)
        .json({ message: "Erreur lors de la suppression du lieu" });
    } else if (this.changes === 0) {
      res.status(404).json({ message: "Lieu non trouvé" });
    } else {
      res.json({ message: "Lieu supprimé avec succès" });
    }
    db.close();
  });
});

// GET /api/store-locations/store/:storeId - Récupérer les lieux d'un magasin spécifique
router.get("/store/:storeId", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { storeId } = req.params;

  const query = `
    SELECT 
      sl.*,
      s.name as store_name
    FROM store_locations sl
    LEFT JOIN stores s ON sl.store_id = s.id
    WHERE sl.store_id = ?
    ORDER BY sl.name
  `;

  db.all(query, [storeId], (err, rows) => {
    if (err) {
      console.error(
        "Erreur lors de la récupération des lieux du magasin:",
        err
      );
      res
        .status(500)
        .json({
          message: "Erreur lors de la récupération des lieux du magasin",
        });
    } else {
      res.json({ locations: rows });
    }
    db.close();
  });
});
