import { Op } from "sequelize";
import db from "../models";

const { SalesTransaction, Recyclery, User, Refund } = db

export const listTransactions = async (req, res) => {
    const {
        store_id,
        period,
        date_from,
        date_to,
        limit = 50,
        offset = 0,
    } = req.query;
    const where = {};
    if (store_id) where.store_id = store_id;
    if (date_from) {
        where.createdAt = {
            ...(where.createdAt || {}),
            [Op.gte]: date_from,
        };
    }
    if (date_to) {
        where.createdAt = { ...(where.createdAt || {}), [Op.lte]: date_to };
    }

    const transactions = await SalesTransaction.findAll({
        where,
        include: [{ model: Recyclery }, { model: User }],
        order: [["createdAt", "DESC"]],
    });

    res.json({
        success: true,
        transactions: transactions,
        pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: transactions.length,
        },
    });
}

export const createTransaction = async (req, res) => {
    const {
        cash_session_id,
        store_id,
        total_amount,
        payment_method = "cash",
        payment_amount,
        change_amount = 0,
        customer_name,
        customer_email,
        customer_postal_code,
        items = [],
    } = req.body;

    // Validation
    if (!cash_session_id || !store_id || !total_amount || !payment_amount) {
        return res.status(400).json({
            success: false,
            error: "Données de transaction incomplètes",
        });
    }

    // Générer un numéro de transaction unique
    const timestamp = Date.now().toString();
    const transactionNumber = `TXN${timestamp.slice(-8)}`;

    // Insérer la transaction
    const result = SalesTransaction.create({
        transaction_number: transactionNumber,
        cash_session_id,
        store_id,
        total_amount,
        payment_method,
        payment_amount,
        change_amount,
        customer_name,
        customer_email,
        customer_postal_code,
        createdBy: req.user.id,
    });

    res.json({
        success: true,
        data: {
            id: result.lastID,
            transactionNumber,
            message: "Transaction créée avec succès",
        },
    });
}

export const createRefund = async (req, res) => {
    const {
        transaction_id,
        refund_type,
        refund_amount,
        refund_reason,
        refund_method,
        notes,
    } = req.body;

    // Validation des champs requis
    if (!transaction_id || !refund_type || !refund_amount || !refund_reason) {
        return res.status(400).json({
            success: false,
            message:
                "Les champs transaction_id, refund_type, refund_amount et refund_reason sont obligatoires",
        });
    }

    // Vérifier que la transaction existe
    const transaction = await SalesTransaction.findByPk(transaction_id);

    if (!transaction) {
        return res.status(404).json({
            success: false,
            message: "Transaction non trouvée",
        });
    }

    // Vérifier que le montant de remboursement ne dépasse pas le montant de la transaction
    if (parseFloat(refund_amount) > transaction.total_amount) {
        return res.status(400).json({
            success: false,
            message:
                "Le montant de remboursement ne peut pas dépasser le montant de la transaction",
        });
    }

    // Créer le remboursement dans la table refunds

    const refund = await Refund.create({
        transaction_id,
        refund_type,
        refund_amount,
        refund_reason,
        refund_method,
        notes,
        created_by: req.user.id,
        status: "completed",
    });

    // Mettre à jour le statut de la transaction si c'est un remboursement total
    if (refund_type === "full") {
        // Note: La table sales_transactions pourrait ne pas avoir de colonne status
        // On peut ajouter une colonne refunded_at pour marquer les transactions remboursées
        await SalesTransaction.update(
            { refundedAt: new Date() },
            { where: { id: transaction_id } }
        );
    }

    // Récupérer les informations du remboursement créé
    const refundInfo = await Refund.findOne({
        where: { id: refund.id },
        include: [{ model: SalesTransaction }, { model: User }],
    });

    res.status(201).json({
        success: true,
        message: "Remboursement créé avec succès",
        refund: refundInfo,
    });
}

export const listRefunds = async (req, res) => {
    const { id } = req.params;

    const refunds = await Refund.findAll({
        where: { transaction_id: id },
        include: [
            { model: SalesTransaction }
        ]
    });
    if (!refunds[0]) {
        return res.status(404).json({
            success: false,
            message: "Transaction non trouvée",
        });
    }

    res.json({
        success: true,
        refunds: refunds,
    });
}