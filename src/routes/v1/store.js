import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";
import db from "../../models/index.js";
import { Op, where } from "sequelize";
import salestransaction from "../../models/salestransaction.js";
const { LabeledItem, Category, User, SalesTransaction, Store, Refund } = db;

// GET - Récupérer tous les magasins
router.get("/", authenticateToken, (req, res) => {
  const query = `
    SELECT s.*, 
           u.username as manager_name,
           COUNT(cr.id) as cash_registers_count
    FROM stores s
    LEFT JOIN users u ON s.manager_id = u.id
    LEFT JOIN cash_registers cr ON s.id = cr.store_id AND cr.is_active = 1
    GROUP BY s.id
    ORDER BY s.name
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Erreur lors de la récupération des magasins:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, stores: rows });
  });
});

// GET - Récupérer un magasin par ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT s.*, 
           u.username as manager_name
    FROM stores s
    LEFT JOIN users u ON s.manager_id = u.id
    WHERE s.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error("Erreur lors de la récupération du magasin:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Magasin non trouvé" });
    }

    res.json({ success: true, store: row });
  });
});

// POST - Créer un nouveau magasin
router.post("/", authenticateToken, requireRole(["admin"]), (req, res) => {
  const { name, address, city, postal_code, phone, email, manager_id } =
    req.body;

  // Validation des champs requis
  if (!name) {
    return res.status(400).json({
      success: false,
      error: "Le nom du magasin est obligatoire",
    });
  }

  const query = `
    INSERT INTO stores (name, address, city, postal_code, phone, email, manager_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    name,
    address || null,
    city || null,
    postal_code || null,
    phone || null,
    email || null,
    manager_id || null,
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Erreur lors de la création du magasin:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.status(201).json({
      success: true,
      message: "Magasin créé avec succès",
      store_id: this.lastID,
    });
  });
});

// PUT - Mettre à jour un magasin
router.put("/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
  const { id } = req.params;
  const {
    name,
    address,
    city,
    postal_code,
    phone,
    email,
    manager_id,
    is_active,
  } = req.body;

  // Validation des champs requis
  if (!name) {
    return res.status(400).json({
      success: false,
      error: "Le nom du magasin est obligatoire",
    });
  }

  const query = `
    UPDATE stores SET
      name = ?, address = ?, city = ?, postal_code = ?, 
      phone = ?, email = ?, manager_id = ?, is_active = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const params = [
    name,
    address || null,
    city || null,
    postal_code || null,
    phone || null,
    email || null,
    manager_id || null,
    is_active !== undefined ? is_active : 1,
    id,
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Erreur lors de la mise à jour du magasin:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (this.changes === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Magasin non trouvé" });
    }

    res.json({ success: true, message: "Magasin mis à jour avec succès" });
  });
});

// DELETE - Supprimer un magasin
router.delete("/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
  const { id } = req.params;

  // Vérifier s'il y a des articles ou des sessions de caisse liés
  const checkQuery = `
    SELECT 
      (SELECT COUNT(*) FROM labeled_items WHERE store_id = ?) as items_count,
      (SELECT COUNT(*) FROM cash_sessions WHERE store_id = ?) as sessions_count
  `;

  db.get(checkQuery, [id, id], (err, row) => {
    if (err) {
      console.error("Erreur lors de la vérification des dépendances:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (row.items_count > 0 || row.sessions_count > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Impossible de supprimer ce magasin car il contient des articles ou des sessions de caisse",
      });
    }

    // Supprimer d'abord les caisses associées
    db.run("DELETE FROM cash_registers WHERE store_id = ?", [id], (err) => {
      if (err) {
        console.error("Erreur lors de la suppression des caisses:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      // Puis supprimer le magasin
      db.run("DELETE FROM stores WHERE id = ?", [id], function (err) {
        if (err) {
          console.error("Erreur lors de la suppression du magasin:", err);
          return res.status(500).json({ success: false, error: err.message });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ success: false, error: "Magasin non trouvé" });
        }

        res.json({ success: true, message: "Magasin supprimé avec succès" });
      });
    });
  });
});

// GET - Récupérer les caisses d'un magasin
router.get("/:id/cash-registers", authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT cr.*,
           COUNT(cs.id) as sessions_count,
           MAX(cs.opened_at) as last_session_date
    FROM cash_registers cr
    LEFT JOIN cash_sessions cs ON cr.id = cs.cash_register_id
    WHERE cr.store_id = ?
    GROUP BY cr.id
    ORDER BY cr.name
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error("Erreur lors de la récupération des caisses:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, cash_registers: rows });
  });
});

// POST - Créer une nouvelle caisse pour un magasin
router.post(
  "/:id/cash-registers",
  authenticateToken,
  requireRole(["admin", "manager"]),
  (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Le nom de la caisse est obligatoire",
      });
    }

    const query = `INSERT INTO cash_registers (name, store_id) VALUES (?, ?)`;

    db.run(query, [name, id], function (err) {
      if (err) {
        console.error("Erreur lors de la création de la caisse:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      res.status(201).json({
        success: true,
        message: "Caisse créée avec succès",
        cash_register_id: this.lastID,
      });
    });
  }
);
