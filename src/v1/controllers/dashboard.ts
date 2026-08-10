import type { Request, Response } from "express";
import { Op } from "sequelize";
import type {
  DashboardActivitiesResponse,
  DashboardActivityDto,
  DashboardChartsResponse,
  DashboardStatsDto,
  DashboardStatsResponse,
  DashboardStoreHistoryResponse,
  DashboardStoreStatsResponse,
} from "@recyclerie/api/responses/dashboard";
import { apiData } from "@recyclerie/api/types/response";
import type { Models } from "../../models/db-types.js";
import db from "../../models/index.js";
import { idSchema } from "../../services/zod.js";
import { findByPkOrThrow } from "../../services/sequelize.js";
import {
  toDashboardStoreDto,
  toDashboardStoreHistoryDto,
} from "../../mappers/dashboard.js";
import { dayjs, now } from "../../utils/dates.js";

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


const profit = (transactions: Models["SalesTransaction"][]) => {
  return transactions.reduce((prev, current) => {
    if (current.transactionType === "sell") prev += current.total_amount;
    if (current.transactionType === "refund") {
      prev -= current.total_amount;
    }
    return prev;
  }, 0);
};

export const dashboardStats = async (_req: Request, res: Response) => {
  // Statistiques principales
  const stats = {} as DashboardStatsDto;

  // 1. Nombre total d'articles
  stats.totalItems = await LabeledItem.count();

  // 2. Articles disponibles (non vendus)
  stats.availableItems = await LabeledItem.count({
    where: { status: "available" },
  });

  //FIXME buggie at the end of the month
  const today = now();
  const lastMonthToday = today.subtract(1, "month");
  const lastMonthFirstDay = lastMonthToday.startOf("month");
  // 3. Articles vendus ce mois - vérifier d'abord les transactions
  const currentMonth = today.format("YYYY-MM");

  
  const month_transactions = await SalesTransaction.findAll({
    where: { createdAt: { [Op.gt]: currentMonth } },
    include: [{ model: LabeledItem, as: "items" }],
  });


  stats.soldThisMonth = month_transactions.reduce((prev, current) => {
    return (
      prev +
      (current.items?.reduce(
        (p, v) => p + (v.TransactionItem?.quantity ?? 0),
        0,
      ) ?? 0)
    );
  }, 0);

  stats.totalRevenue = profit(month_transactions); //TODO ignorer les refunds ? //TODO duplicate

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
  stats.usersCount = await User.count({ where: { isActive: true } });

  // 9. Chiffre d'affaires du mois dernier pour comparaison
  const lastMonthRevenueResult = await SalesTransaction.findAll({
    where: {
      createdAt: {
        [Op.between]: [
          //TODO use daterange where ?
          lastMonthFirstDay.format("YYYY-MM-DD"),
          lastMonthToday.format("YYYY-MM-DD"),
        ],
      },
    },
  });
  stats.lastMonthRevenue = profit(lastMonthRevenueResult);

  stats.lastMonthSales = lastMonthRevenueResult.length;

  stats.thisMonthRevenue = profit(month_transactions);
  stats.thisMonthSales = month_transactions.length;

  res.json(apiData(stats) satisfies DashboardStatsResponse);
};


export const dashboardActivities = async (_req: Request, res: Response) => {
  const activities = [] as DashboardActivityDto[];

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

  res.json(apiData(activities.slice(0, 10)) satisfies DashboardActivitiesResponse);
};

export const dashboardCharts = async (_req: Request, res: Response) => {
  // Ventes des 7 derniers jours
  const salesData = [];
  const revenueData = [];
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const date = now().subtract(i, "day");
    const dateStr = date.format("YYYY-MM-DD");

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
    labels.push(date.format("DD MMM"));
  }

  res.json(
    apiData({
      sales: salesData,
      revenue: revenueData,
      labels: labels,
    }) satisfies DashboardChartsResponse,
  );
};


const getMonthTransactions = async (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, store: Models["Recyclery"]) => {
  const caissesId = store.caisses?.map((caisse) => caisse.id);
  const month_transactions = await SalesTransaction.findAll({
    where: {
      createdAt: {
        [Op.between]: [
          startDate.format("YYYY-MM-DD"),
          endDate.format("YYYY-MM-DD"),
        ],
      },
    },
    include: [
      {
        model: CashSession,
        where: {
          cash_register_id: { [Op.in]: caissesId },
        },
        required: true,
      },
      {
        model: LabeledItem,
        as: "items",
      },
    ],
  });
  const monthSales = month_transactions.length;
  const monthRevenue = profit(month_transactions);

  const sessions = await CashSession.count({
    where: {
      createdAt: {
        [Op.between]: [
          startDate.format("YYYY-MM-DD"),
          endDate.format("YYYY-MM-DD"),
        ],
      },
    },
    include: [
      {
        model: CashRegister,
        where: { recyclery_id: store.id },
        required: true,
      },
    ],
  });

  return {
    transactions: monthSales,
    revenue: monthRevenue,
    averageTransaction: monthRevenue / monthSales,
    sessions: sessions,
    start: startDate.toDate(),
    end: endDate.toDate(),
    itemsSold:month_transactions.reduce((prev, current) => {
      return (
        prev +
        (current.items?.reduce(
          (p, v) => p + (v.TransactionItem?.quantity ?? 0),
          0,
        ) ?? 0)
      );
    }, 0),
  }

}

const statsMonth = async (
  store: Models["Recyclery"],
  theToday: Date = now().toDate(),
) => {
  const today = dayjs(theToday);
  const firstDayOfMonth = today.startOf("month");
  const todayLastMonth = today.subtract(1, "month");
  const firstDayOfLastMonth = todayLastMonth.startOf("month");

   const currentMonthTransactions = await getMonthTransactions(firstDayOfMonth, today, store);
  const lastMonthTransactions = await getMonthTransactions(firstDayOfLastMonth, todayLastMonth, store);

  const revenueGrowth= lastMonthTransactions.revenue>0 ?((currentMonthTransactions.revenue - lastMonthTransactions.revenue) / lastMonthTransactions.revenue) * 100 : 0;

  return {
    currentMonth: {
      ...currentMonthTransactions
    },
    lastMonth: {
      ...lastMonthTransactions
    },
    items: {
      available: 0, // Temporairement fixé à 0
      sold: currentMonthTransactions.itemsSold,
    },
    growth: {
      revenue: revenueGrowth,
    },
  };
};

export const dashboardStoreStats = async (_req: Request, res: Response) => {
  // Récupérer tous les magasins actifs
  const stores = await Recyclery.findAll({
    where: { is_active: true },
    include: [{ model: CashRegister, as: "caisses" }],
    order: ["name"],
  });

  res.json(
    apiData(
      await Promise.all(
        stores.map(async (store) =>
          toDashboardStoreDto({
            id: store.id,
            name: store.name,
            address: store.address,
            phone: store.phone,
            email: store.email,
            stats: await statsMonth(store),
          }),
        ),
      ),
    ) satisfies DashboardStoreStatsResponse,
  );
};

export const StoreHistoryStats = async (req: Request, res: Response) => {
  const id = idSchema("store id requis").parse(req.params.id);

  const store = await findByPkOrThrow(Recyclery, id, "magasin pas trouvé", {
    include: [{ model: CashRegister, as: "caisses" }],
  });

  const storeStat = [];
  for (let index = 0; index < 12; index++) {
    const today = new Date();
    today.setMonth(today.getMonth() - index);
    storeStat.push(await statsMonth(store, today));
  }

  res.json(
    apiData(
      toDashboardStoreHistoryDto({
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        stats: storeStat,
      }),
    ) satisfies DashboardStoreHistoryResponse,
  );
};
