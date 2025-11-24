import express, { Request, Response } from 'express';
import Order from '../models/Order';
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

    // Totals
    const totalOrders = await Order.countDocuments();
    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // Status counts
    const [pendingOrders, completedOrders] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
    ]);

    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top selling items by quantity and revenue from order items
    const topItemsAgg = await Order.aggregate([
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

    res.json({
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      averageOrderValue,
      topSellingItems,
      recentOrders,
      revenueChart: [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;


