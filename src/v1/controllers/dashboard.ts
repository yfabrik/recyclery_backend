import type { Request, Response } from "express";
import { Op } from "sequelize";

import db from "../../models/index.js";

const {
  LabeledItem,
  SalesTransaction,
  Donation,
  Task,
  User,
  Category,
  CollectionPoint,
  Recyclery,
  CashRegister,
  CashSession,
} = db;

// Fonctions utilitaires
function formatTimeAgo(dateString: string | Date) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((+now - +date) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes}min`;
  } else if (diffInMinutes < 1440) {
    return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
  } else {
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  }
}

function formatDate(dateString: string | Date) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type stats = {
  totalItems: number;
  availableItems: number;
  soldThisMonth: number;
  totalRevenue: number;
  pendingDonations: number;
  scheduledCollections: number;
  categoriesCount: number;
  usersCount: number;
  lastMonthRevenue: number;
  lastMonthSales: number;
  thisMonthRevenue: number;
  thisMonthSales: number;
};

export const dashboardStats = async (_req: Request, res: Response) => {
  // Statistiques principales
  const stats = {} as stats;

  // 1. Nombre total d'articles
  stats.totalItems = await LabeledItem.count();

  // 2. Articles disponibles (non vendus)
  stats.availableItems = await LabeledItem.count({
    where: { status: "available" },
  });

  // 3. Articles vendus ce mois - vérifier d'abord les transactions
  const currentMonth = new Date().toISOString().slice(0, 7); // Format YYYY-MM
  const month_transactions = await SalesTransaction.findAll({
    where: { createdAt: { [Op.gt]: currentMonth } },
    include: [{ model: LabeledItem, as: "items" }]
  });

  stats.soldThisMonth = month_transactions.reduce((prev, current) => {
    return prev + (current.items?.reduce((p, v) => p + (v.TransactionItem?.quantity ?? 0), 0) ?? 0)
  }, 0);

  stats.totalRevenue = month_transactions.reduce(
    (prev, current) => (prev += current.total_amount),
    0,
  );

  // 5. Dons en attente
  stats.pendingDonations = await Donation.count({
    where: { status: "pending" },
  });

  // 6. Collections programmées ce mois
  // console.log(CollectionSchedule.findAll({ where: { scheduled_date: { [Op.gt]: currentMonth } } }))
  stats.scheduledCollections = await Task.count({
    where: {
      category: "collection",
      scheduled_date: { [Op.gt]: currentMonth },
    },
  });

  // 7. Nombre de catégories actives
  stats.categoriesCount = await LabeledItem.count({
    distinct: true,
    col: "category_id",
    where: { status: "available" },
  });

  // 8. Nombre d'utilisateurs actifs
  stats.usersCount = await User.count();

  // 9. Chiffre d'affaires du mois dernier pour comparaison
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  // Utiliser les transactions de vente
  const lastMonthRevenueResult = await SalesTransaction.findAll({
    where: { createdAt: { [Op.between]: [lastMonthStr, currentMonth] } },
  });
  stats.lastMonthRevenue = lastMonthRevenueResult.reduce(
    (prev, current) => (prev += current.total_amount),
    0,
  );

  stats.lastMonthSales = lastMonthRevenueResult.length;

  stats.thisMonthRevenue = month_transactions.reduce(
    (prev, current) => (prev += current.total_amount),
    0,
  );
  stats.thisMonthSales = month_transactions.length;

  res.json({
    success: true,
    data: stats,
  });
};

type activity = {
  id: string;
  type: string;
  description: string;
  amount: string;
  time: string;
  icon: string;
  color: string;
  status: string;
  statusColor: string;
};
export const dashboardActivities = async (_req: Request, res: Response) => {
  const activities = [] as activity[];

  // 1. Ventes récentes
  const recentSales = await LabeledItem.findAll({
    where: { status: "sold" },
    include: [{ model: Category, as: "category" }],
    limit: 5,
    order: [["updatedAt", "DESC"]],
  });

  recentSales.forEach((sale) => {
    activities.push({
      id: `sale_${sale.id}`,
      type: "sale",
      description: `Vente: ${sale.id}`,
      amount: `${sale.price}€`,
      time: formatTimeAgo(sale.updatedAt),
      icon: "ShoppingCart",
      color: "success",
      status: "Complété",
      statusColor: "success",
    });
  });

  // 2. Dons récents
  const recentDonations = await Donation.findAll({
    order: [["createdAt", "DESC"]],
    limit: 5,
  });

  recentDonations.forEach((donation) => {
    activities.push({
      id: `donation_${donation.id}`,
      type: "donation",
      description: `Don de ${donation.donor_name}`,
      amount: `${1} articles`,
      time: formatTimeAgo(donation.createdAt),
      icon: "VolunteerActivism",
      color: "info",
      status: donation.status === "pending" ? "En attente" : "Traité",
      statusColor: donation.status === "pending" ? "warning" : "success",
    });
  });

  // 3. Collections récentes
  const recentCollections = await Task.findAll({
    where: { category: "collection" },
    include: [
      { model: CollectionPoint, required: false },
      { model: Recyclery, required: false },
    ],
    order: [["scheduled_date", "DESC"]],
    limit: 5,
  });

  recentCollections.forEach((collection) => {
    activities.push({
      id: `collection_${collection.id}`,
      type: "collection",
      description: `Collecte: ${collection.location}`,
      amount: formatDate(collection.scheduled_date),
      time: formatTimeAgo(collection.scheduled_date),
      icon: "LocalShipping",
      color: "warning",
      status: collection.status === "scheduled" ? "Programmé" : "Effectué",
      statusColor: collection.status === "scheduled" ? "info" : "success",
    });
  });

  // Trier par date et limiter à 10 activités
  activities.sort((a, b) => +new Date(b.time) - +new Date(a.time));

  res.json({
    success: true,
    data: activities.slice(0, 10),
  });
};

export const dashboardCharts = async (_req: Request, res: Response) => {
  // Ventes des 7 derniers jours
  const salesData = [];
  const revenueData = [];
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    // Vérifier d'abord si on a des transactions de vente
    const hasTransactions = await SalesTransaction.findAll({
      where: { createdAt: dateStr },
    });

    // Utiliser les transactions de vente si elles existent
    const daySales = hasTransactions.length;
    const dayRevenue = hasTransactions.reduce(
      (prev, current) => (prev += current.total_amount),
      0,
    );

    salesData.push(daySales);
    revenueData.push(dayRevenue);
    labels.push(
      date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    );
  }

  res.json({
    success: true,
    data: {
      sales: salesData,
      revenue: revenueData,
      labels: labels,
    },
  });
};

export const dashboardStoreStats = async (_req: Request, res: Response) => {
  // Récupérer tous les magasins actifs
  const stores = await Recyclery.findAll({
    where: { is_active: true },
    include: [{ model: CashRegister, as: "caisses" }],
    order: ["name"],
  });

  const storesStats = [];

  const currentMonth = new Date().toISOString().slice(0, 7); // Format YYYY-MM

  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  for (const store of stores) {
    // Statistiques des ventes du mois en cours
    const caissesId = store.caisses?.map((caisse) => caisse.id);
    const month_transactions = await SalesTransaction.findAll({
      where: {
        createdAt: { [Op.gt]: currentMonth },
      },
      include: [
        {
          model: CashSession,
          where: {
            cash_register_id: { [Op.in]: caissesId },
          },
          required: true,
        },
      ],
    });

    const currentMonthSales = month_transactions.length;

    const currentRevenue = month_transactions.reduce(
      (prev, current) => (prev += current.total_amount),
      0,
    );

    // Utiliser les transactions de vente
    const lastMonthRevenueResult = await SalesTransaction.findAll({
      where: { createdAt: { [Op.between]: [lastMonthStr, currentMonth] } },
    });
    const lastMonthRevenue = lastMonthRevenueResult.reduce(
      (prev, current) => (prev += current.total_amount),
      0,
    );

    const sessions = await CashSession.count({
      where: {
        createdAt: { [Op.between]: [lastMonthStr, currentMonth] },
      },
      include: [
        {
          model: CashRegister,
          where: { recyclery_id: store.id },
          required: true,
        },
      ],
    });

    // Ventes des 7 derniers jours
    // const weeklySales = await database.query(`
    //       SELECT
    //         DATE(created_at) as date,
    //         COUNT(*) as sales_count,
    //         COALESCE(SUM(total_amount), 0) as revenue
    //       FROM sales_transactions
    //       WHERE store_id = ?
    //       AND DATE(created_at) >= DATE('now', '-7 days')
    //       GROUP BY DATE(created_at)
    //       ORDER BY date
    //     `, [store.id]);

    // Calculer l'évolution par rapport au mois dernier

    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    storesStats.push({
      id: store.id,
      name: store.name,
      address: store.address,
      phone: store.phone,
      email: store.email,
      stats: {
        currentMonth: {
          transactions: currentMonthSales,
          revenue: currentRevenue,
          averageTransaction: 0,
          sessions: sessions,
        },
        lastMonth: {
          transactions: lastMonthRevenueResult.length,
          revenue: lastMonthRevenue,
        },
        items: {
          available: 0, // Temporairement fixé à 0
        },
        growth: {
          revenue: revenueGrowth,
        },
        // weeklyData: weeklySales.map(day => ({
        //   date: day.date,
        //   sales: day.sales_count,
        //   revenue: parseFloat(day.revenue || 0)
        // }))
      },
    });
  }

  res.json({
    success: true,
    stores: storesStats,
  });
};
