import express, { Request, Response } from 'express';
import Order from '../models/Order';
import SalesRecord from '../models/SalesRecord';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin auth middleware - requires admin or super-admin role
function requireAdmin(req: any, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Check if user has admin role
    if (decoded.role !== 'admin' && decoded.role !== 'super-admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Recent orders
    const recentOrdersRaw = await Order.find({}).sort({ createdAt: -1 }).limit(5);
    const recentOrders = recentOrdersRaw.map((o: any) => ({
      id: o._id.toString(),
      total: o.total,
      status: o.status,
      orderedAt: o.createdAt,
    }));

    // Totals - Exclude cancelled and rejected orders from count
    const validStatuses = { status: { $nin: ['cancelled', 'rejected'] } };
    const totalOrders = await Order.countDocuments(validStatuses);

    // Status counts
    const [pendingOrders, completedOrdersCount] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
    ]);

    // Top selling items - only from delivered orders
    const topItemsAgg = await Order.aggregate([
      { $match: { status: 'delivered' } }, // Only delivered orders
      { $unwind: '$items' },
      {
        $group: {
          _id: { itemId: '$items.itemId', name: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);
    const topSellingItems = topItemsAgg.map((it: any) => ({
      id: it._id.itemId || it._id.name,
      name: it._id.name,
      quantity: it.quantity,
      revenue: it.revenue,
    }));

    // Get persistent sales statistics from SalesRecord
    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await SalesRecord.findOne({ date: today });

    // This month's sales
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthSales = await SalesRecord.find({
      date: { $gte: thisMonthStart }
    });
    const thisMonthRevenue = thisMonthSales.reduce((sum, record) => sum + record.totalRevenue, 0);
    const thisMonthOrders = thisMonthSales.reduce((sum, record) => sum + record.totalOrders, 0);

    // All-time sales from SalesRecord
    const allTimeSales = await SalesRecord.find({});
    const allTimeRevenue = allTimeSales.reduce((sum, record) => sum + record.totalRevenue, 0);
    const allTimeOrdersFromSales = allTimeSales.reduce((sum, record) => sum + record.totalOrders, 0);

    // Use persistent data for revenue and completed orders
    const totalRevenue = allTimeRevenue;
    const completedOrders = allTimeOrdersFromSales;
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    res.json({
      totalOrders, // This remains from Order collection (active + visible history)
      totalRevenue,
      pendingOrders,
      completedOrders,
      averageOrderValue,
      topSellingItems,
      recentOrders,
      revenueChart: [],
      // Persistent sales data (won't be lost when orders are cleared)
      salesStatistics: {
        today: {
          revenue: todaySales?.totalRevenue || 0,
          orders: todaySales?.totalOrders || 0,
          items: todaySales?.totalItems || 0,
          averageOrderValue: todaySales?.averageOrderValue || 0,
        },
        thisMonth: {
          revenue: thisMonthRevenue,
          orders: thisMonthOrders,
          averageOrderValue: thisMonthOrders > 0 ? thisMonthRevenue / thisMonthOrders : 0,
        },
        allTime: {
          revenue: allTimeRevenue,
          orders: allTimeOrdersFromSales,
          averageOrderValue: allTimeOrdersFromSales > 0 ? allTimeRevenue / allTimeOrdersFromSales : 0,
        },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
