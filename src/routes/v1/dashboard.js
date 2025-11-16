
import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authenticateToken } from "../../middlewares/auth.js";

export const router = Router();
// Route de test sans authentification
router.get('/test', async (req, res) => {

  res.json({
    success: true,
    message: 'API Dashboard fonctionne',
    data: {
      itemsCount: testQuery[0].count,
      transactionsCount: transactionsQuery[0].count,
      timestamp: new Date().toISOString()
    }
  });

});

// Route pour créer des données de test (développement uniquement)
router.post('/create-test-data', authenticateToken, async (req, res) => {

  res.json({
    success: true,
    message: 'Données de test créées avec succès',
    data: testData
  });
});

// Route pour récupérer les statistiques du dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    await database.connect();

    // Statistiques principales
    const stats = {};

    // 1. Nombre total d'articles
    const totalItemsResult = await database.query(
      'SELECT COUNT(*) as count FROM items'
    );
    stats.totalItems = totalItemsResult[0].count;

    // 2. Articles disponibles (non vendus)
    const availableItemsResult = await database.query(
      'SELECT COUNT(*) as count FROM items WHERE status = "available"'
    );
    stats.availableItems = availableItemsResult[0].count;

    // 3. Articles vendus ce mois - vérifier d'abord les transactions
    const currentMonth = new Date().toISOString().slice(0, 7); // Format YYYY-MM

    // Vérifier si on a des transactions de vente
    const hasTransactions = await database.query(
      'SELECT COUNT(*) as count FROM sales_transactions WHERE strftime("%Y-%m", created_at) = ?',
      [currentMonth]
    );

    if (hasTransactions[0].count > 0) {
      // Utiliser les transactions de vente
      const soldThisMonthResult = await database.query(
        `SELECT COUNT(*) as count FROM sales_transactions 
         WHERE strftime('%Y-%m', created_at) = ?`,
        [currentMonth]
      );
      stats.soldThisMonth = soldThisMonthResult[0].count;

      const revenueThisMonthResult = await database.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_transactions 
         WHERE strftime('%Y-%m', created_at) = ?`,
        [currentMonth]
      );
      stats.totalRevenue = parseFloat(revenueThisMonthResult[0].total || 0);
    } else {
      // Fallback sur les items vendus
      const soldThisMonthResult = await database.query(
        `SELECT COUNT(*) as count FROM items 
         WHERE status = "sold" 
         AND strftime('%Y-%m', updated_at) = ?`,
        [currentMonth]
      );
      stats.soldThisMonth = soldThisMonthResult[0].count;

      const revenueThisMonthResult = await database.query(
        `SELECT COALESCE(SUM(selling_price), 0) as total FROM items 
         WHERE status = "sold" 
         AND strftime('%Y-%m', updated_at) = ?`,
        [currentMonth]
      );
      stats.totalRevenue = parseFloat(revenueThisMonthResult[0].total || 0);
    }

    // 5. Dons en attente
    const pendingDonationsResult = await database.query(
      'SELECT COUNT(*) as count FROM donations WHERE status = "pending"'
    );
    stats.pendingDonations = pendingDonationsResult[0].count;

    // 6. Collections programmées ce mois
    const scheduledCollectionsResult = await database.query(
      `SELECT COUNT(*) as count FROM collection_schedules 
       WHERE strftime('%Y-%m', scheduled_date) = ?`,
      [currentMonth]
    );
    stats.scheduledCollections = scheduledCollectionsResult[0].count;

    // 7. Nombre de catégories actives
    const categoriesCountResult = await database.query(
      'SELECT COUNT(DISTINCT category_id) as count FROM items WHERE status = "available"'
    );
    stats.categoriesCount = categoriesCountResult[0].count;

    // 8. Nombre d'utilisateurs actifs
    const usersCountResult = await database.query(
      'SELECT COUNT(*) as count FROM users WHERE role IN ("employee", "manager", "admin")'
    );
    stats.usersCount = usersCountResult[0].count;

    // 9. Chiffre d'affaires du mois dernier pour comparaison
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    // Vérifier si on a des transactions pour le mois dernier
    const hasLastMonthTransactions = await database.query(
      'SELECT COUNT(*) as count FROM sales_transactions WHERE strftime("%Y-%m", created_at) = ?',
      [lastMonthStr]
    );

    if (hasLastMonthTransactions[0].count > 0) {
      // Utiliser les transactions de vente
      const lastMonthRevenueResult = await database.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_transactions 
         WHERE strftime('%Y-%m', created_at) = ?`,
        [lastMonthStr]
      );
      stats.lastMonthRevenue = parseFloat(lastMonthRevenueResult[0].total || 0);

      const lastMonthSalesResult = await database.query(
        `SELECT COUNT(*) as count FROM sales_transactions 
         WHERE strftime('%Y-%m', created_at) = ?`,
        [lastMonthStr]
      );
      stats.lastMonthSales = lastMonthSalesResult[0].count;
    } else {
      // Fallback sur les items vendus
      const lastMonthRevenueResult = await database.query(
        `SELECT COALESCE(SUM(selling_price), 0) as total FROM items 
         WHERE status = "sold" 
         AND strftime('%Y-%m', updated_at) = ?`,
        [lastMonthStr]
      );
      stats.lastMonthRevenue = parseFloat(lastMonthRevenueResult[0].total || 0);

      const lastMonthSalesResult = await database.query(
        `SELECT COUNT(*) as count FROM items 
         WHERE status = "sold" 
         AND strftime('%Y-%m', updated_at) = ?`,
        [lastMonthStr]
      );
      stats.lastMonthSales = lastMonthSalesResult[0].count;
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// Route pour récupérer les activités récentes
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    await database.connect();

    const activities = [];

    // 1. Ventes récentes
    const recentSales = await database.query(
      `SELECT 
        i.id,
        i.name,
        i.selling_price,
        i.updated_at,
        c.name as category_name
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.status = 'sold'
       ORDER BY i.updated_at DESC
       LIMIT 5`
    );

    recentSales.forEach(sale => {
      activities.push({
        id: `sale_${sale.id}`,
        type: 'sale',
        description: `Vente: ${sale.name}`,
        amount: `${sale.selling_price}€`,
        time: formatTimeAgo(sale.updated_at),
        icon: 'ShoppingCart',
        color: 'success',
        status: 'Complété',
        statusColor: 'success'
      });
    });

    // 2. Dons récents
    const recentDonations = await database.query(
      `SELECT 
        d.id,
        d.donor_name,
        d.status,
        d.created_at,
        1 as items_count
       FROM donations d
       ORDER BY d.created_at DESC
       LIMIT 5`
    );

    recentDonations.forEach(donation => {
      activities.push({
        id: `donation_${donation.id}`,
        type: 'donation',
        description: `Don de ${donation.donor_name}`,
        amount: `${donation.items_count} articles`,
        time: formatTimeAgo(donation.created_at),
        icon: 'VolunteerActivism',
        color: 'info',
        status: donation.status === 'pending' ? 'En attente' : 'Traité',
        statusColor: donation.status === 'pending' ? 'warning' : 'success'
      });
    });

    // 3. Collections récentes
    const recentCollections = await database.query(
      `SELECT 
        cs.id,
        cp.name as point_name,
        cs.scheduled_date,
        cs.status
       FROM collection_schedules cs
       LEFT JOIN collection_points cp ON cs.collection_point_id = cp.id
       ORDER BY cs.scheduled_date DESC
       LIMIT 5`
    );

    recentCollections.forEach(collection => {
      activities.push({
        id: `collection_${collection.id}`,
        type: 'collection',
        description: `Collecte: ${collection.point_name}`,
        amount: formatDate(collection.scheduled_date),
        time: formatTimeAgo(collection.scheduled_date),
        icon: 'LocalShipping',
        color: 'warning',
        status: collection.status === 'scheduled' ? 'Programmé' : 'Effectué',
        statusColor: collection.status === 'scheduled' ? 'info' : 'success'
      });
    });

    // Trier par date et limiter à 10 activités
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      data: activities.slice(0, 10)
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des activités',
      error: error.message
    });
  }
});

// Route pour récupérer les données de graphiques
router.get('/charts', authenticateToken, async (req, res) => {
  try {
    await database.connect();

    // Ventes des 7 derniers jours
    const salesData = [];
    const revenueData = [];
    const labels = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      // Vérifier d'abord si on a des transactions de vente
      const hasTransactions = await database.query(
        'SELECT COUNT(*) as count FROM sales_transactions WHERE DATE(created_at) = ?',
        [dateStr]
      );

      let daySales = 0;
      let dayRevenue = 0;

      if (hasTransactions[0].count > 0) {
        // Utiliser les transactions de vente si elles existent
        const daySalesResult = await database.query(
          `SELECT COUNT(*) as count FROM sales_transactions 
           WHERE DATE(created_at) = ?`,
          [dateStr]
        );

        const dayRevenueResult = await database.query(
          `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_transactions 
           WHERE DATE(created_at) = ?`,
          [dateStr]
        );

        daySales = daySalesResult[0].count;
        dayRevenue = parseFloat(dayRevenueResult[0].total || 0);
      } else {
        // Fallback sur les items vendus
        const daySalesResult = await database.query(
          `SELECT COUNT(*) as count FROM items 
           WHERE status = 'sold' 
           AND DATE(updated_at) = ?`,
          [dateStr]
        );

        const dayRevenueResult = await database.query(
          `SELECT COALESCE(SUM(selling_price), 0) as total FROM items 
           WHERE status = 'sold' 
           AND DATE(updated_at) = ?`,
          [dateStr]
        );

        daySales = daySalesResult[0].count;
        dayRevenue = parseFloat(dayRevenueResult[0].total || 0);
      }

      salesData.push(daySales);
      revenueData.push(dayRevenue);
      labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
    }

    console.log('Données des graphiques calculées:', { sales: salesData, revenue: revenueData, labels });

    res.json({
      success: true,
      data: {
        sales: salesData,
        revenue: revenueData,
        labels: labels
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des graphiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des graphiques',
      error: error.message
    });
  }
});

// Fonctions utilitaires
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes}min`;
  } else if (diffInMinutes < 1440) {
    return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
  } else {
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Route pour récupérer les statistiques par magasin
router.get('/stores-stats', authenticateToken, async (req, res) => {
  try {
    await database.connect();

    // Récupérer tous les magasins actifs
    const stores = await database.query(`
      SELECT id, name, address, phone, email, is_active
      FROM stores 
      WHERE is_active = 1
      ORDER BY name
    `);

    console.log(`📊 Magasins trouvés: ${stores.length}`);

    const storesStats = [];

    for (const store of stores) {
      console.log(`🏪 Traitement du magasin: ${store.name} (ID: ${store.id})`);

      try {
        // Statistiques des ventes du mois en cours
        const currentMonthSales = await database.query(`
          SELECT 
            COUNT(*) as transactions_count,
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(AVG(total_amount), 0) as average_transaction
          FROM sales_transactions 
          WHERE store_id = ? 
          AND DATE(created_at) >= DATE('now', 'start of month')
        `, [store.id]);

        // Statistiques des ventes du mois dernier
        const lastMonthSales = await database.query(`
          SELECT 
            COUNT(*) as transactions_count,
            COALESCE(SUM(total_amount), 0) as total_revenue
          FROM sales_transactions 
          WHERE store_id = ? 
          AND DATE(created_at) >= DATE('now', 'start of month', '-1 month')
          AND DATE(created_at) < DATE('now', 'start of month')
        `, [store.id]);

        // Sessions de caisse du mois
        const sessionsCount = await database.query(`
          SELECT COUNT(*) as count
          FROM cash_sessions 
          WHERE store_id = ? 
          AND DATE(opened_at) >= DATE('now', 'start of month')
        `, [store.id]);

        // Ventes des 7 derniers jours
        const weeklySales = await database.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as sales_count,
            COALESCE(SUM(total_amount), 0) as revenue
          FROM sales_transactions 
          WHERE store_id = ? 
          AND DATE(created_at) >= DATE('now', '-7 days')
          GROUP BY DATE(created_at)
          ORDER BY date
        `, [store.id]);

        // Calculer l'évolution par rapport au mois dernier
        const currentRevenue = parseFloat(currentMonthSales[0].total_revenue || 0);
        const lastMonthRevenue = parseFloat(lastMonthSales[0].total_revenue || 0);
        const revenueGrowth = lastMonthRevenue > 0
          ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
          : 0;

        storesStats.push({
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          email: store.email,
          stats: {
            currentMonth: {
              transactions: currentMonthSales[0].transactions_count || 0,
              revenue: currentRevenue,
              averageTransaction: parseFloat(currentMonthSales[0].average_transaction || 0),
              sessions: sessionsCount[0].count || 0
            },
            lastMonth: {
              transactions: lastMonthSales[0].transactions_count || 0,
              revenue: lastMonthRevenue
            },
            items: {
              available: 0 // Temporairement fixé à 0
            },
            growth: {
              revenue: revenueGrowth
            },
            weeklyData: weeklySales.map(day => ({
              date: day.date,
              sales: day.sales_count,
              revenue: parseFloat(day.revenue || 0)
            }))
          }
        });

        console.log(`✅ Magasin ${store.name} traité avec succès`);

      } catch (storeError) {
        console.error(`❌ Erreur pour le magasin ${store.name}:`, storeError.message);

        // Ajouter le magasin avec des statistiques vides en cas d'erreur
        storesStats.push({
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          email: store.email,
          stats: {
            currentMonth: { transactions: 0, revenue: 0, averageTransaction: 0, sessions: 0 },
            lastMonth: { transactions: 0, revenue: 0 },
            items: { available: 0 },
            growth: { revenue: 0 },
            weeklyData: []
          }
        });
      }
    }

    console.log(`📊 ${storesStats.length} magasins traités`);

    res.json({
      success: true,
      stores: storesStats
    });

  } catch (error) {
    console.error('Erreur récupération stats magasins:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques par magasin',
      error: error.message
    });
  }
});

