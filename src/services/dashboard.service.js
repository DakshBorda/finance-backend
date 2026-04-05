const { prisma } = require('../config/database');

const ACTIVE_FILTER = { isDeleted: false };

class DashboardService {

  // Financial overview: total income, expense, balance, transaction count.
  // Accepts optional date range for period-specific analysis.
  static async getOverview({ dateFrom, dateTo } = {}) {
    const where = { ...ACTIVE_FILTER };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const groups = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    let totalIncome = 0, totalExpense = 0, incomeCount = 0, expenseCount = 0;

    for (const g of groups) {
      const amount = parseFloat(g._sum.amount?.toString() || '0');
      if (g.type === 'INCOME') {
        totalIncome = amount;
        incomeCount = g._count;
      } else {
        totalExpense = amount;
        expenseCount = g._count;
      }
    }

    return {
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netBalance: (totalIncome - totalExpense).toFixed(2),
      transactionCount: incomeCount + expenseCount,
      incomeCount,
      expenseCount,
    };
  }

  // Breakdown by category with percentage of total.
  // Useful for pie charts on the frontend.
  static async getCategorySummary({ type, dateFrom, dateTo } = {}) {
    const where = { ...ACTIVE_FILTER };
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const groups = await prisma.transaction.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const grandTotal = groups.reduce(
      (sum, g) => sum + parseFloat(g._sum.amount?.toString() || '0'), 0
    );

    return groups.map(g => {
      const amount = parseFloat(g._sum.amount?.toString() || '0');
      return {
        category: g.category,
        totalAmount: amount.toFixed(2),
        count: g._count,
        percentage: grandTotal > 0
          ? parseFloat(((amount / grandTotal) * 100).toFixed(1))
          : 0,
      };
    });
  }

  // Monthly income vs expense trends for the last N months.
  // Uses raw SQL because Prisma's groupBy doesn't support
  // date truncation natively — this is one of those cases
  // where the ORM gets in the way.
  static async getTrends({ months = 12 } = {}) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const rows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month,
        type,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*)::int AS count
      FROM transactions
      WHERE is_deleted = false
        AND date >= ${cutoff}
      GROUP BY month, type
      ORDER BY month ASC
    `;

    // Pivot rows into { month, income, expense, net } format
    const monthMap = new Map();

    for (const row of rows) {
      if (!monthMap.has(row.month)) {
        monthMap.set(row.month, { month: row.month, income: '0.00', expense: '0.00', net: '0.00', incomeCount: 0, expenseCount: 0 });
      }
      const entry = monthMap.get(row.month);
      const amount = parseFloat(row.total?.toString() || '0');

      if (row.type === 'INCOME') {
        entry.income = amount.toFixed(2);
        entry.incomeCount = Number(row.count);
      } else {
        entry.expense = amount.toFixed(2);
        entry.expenseCount = Number(row.count);
      }
    }

    // Calculate net and 3-month moving average
    const trends = Array.from(monthMap.values());
    for (let i = 0; i < trends.length; i++) {
      const income = parseFloat(trends[i].income);
      const expense = parseFloat(trends[i].expense);
      trends[i].net = (income - expense).toFixed(2);

      // 3-month moving average of net — smooths out seasonal spikes
      if (i >= 2) {
        const avg = (
          parseFloat(trends[i].net) +
          parseFloat(trends[i - 1].net) +
          parseFloat(trends[i - 2].net)
        ) / 3;
        trends[i].movingAverage = avg.toFixed(2);
      } else {
        trends[i].movingAverage = null;
      }
    }

    return trends;
  }

  // Most recent transactions for a quick activity feed.
  static async getRecent({ limit = 5 } = {}) {
    const transactions = await prisma.transaction.findMany({
      where: ACTIVE_FILTER,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 20),
    });

    return transactions.map(txn => ({
      ...txn,
      amount: txn.amount?.toString(),
    }));
  }

  // Top N categories by total amount, optionally filtered by type.
  // Supports both "top spending" and "top earning" views.
  static async getTopCategories({ limit = 5, type } = {}) {
    const where = { ...ACTIVE_FILTER };
    if (type) where.type = type;

    const groups = await prisma.transaction.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: Math.min(limit, 20),
    });

    return groups.map(g => ({
      category: g.category,
      totalAmount: parseFloat(g._sum.amount?.toString() || '0').toFixed(2),
      count: g._count,
    }));
  }
}

module.exports = DashboardService;
