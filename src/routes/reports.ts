import express, { Request, Response } from 'express';
import Order from '../models/Order';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin auth middleware
function requireAdmin(req: any, res: Response, next: Function) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authentication token' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

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

// GET /api/reports/daily-sales
router.get('/daily-sales', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        // Default to last 30 days if no dates provided
        const end = endDate ? new Date(endDate as string) : new Date();
        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Set time to start/end of day
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Aggregate daily sales
        const dailySales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    totalOrders: { $sum: 1 },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'delivered'] },
                                '$total',
                                0
                            ]
                        }
                    },
                    deliveredOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
                        }
                    },
                    cancelledOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
                        }
                    },
                    pendingOrders: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
                        }
                    },
                }
            },
            {
                $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
            }
        ]);

        // Format the results
        const formattedSales = dailySales.map(day => ({
            date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
            totalOrders: day.totalOrders,
            totalRevenue: day.totalRevenue,
            deliveredOrders: day.deliveredOrders,
            cancelledOrders: day.cancelledOrders,
            pendingOrders: day.pendingOrders,
            averageOrderValue: day.deliveredOrders > 0 ? day.totalRevenue / day.deliveredOrders : 0,
        }));

        res.json(formattedSales);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/reports/today
router.get('/today', requireAdmin, async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const orders = await Order.find({
            createdAt: { $gte: today, $lt: tomorrow }
        });

        const stats = {
            totalOrders: orders.length,
            totalRevenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0),
            deliveredOrders: orders.filter(o => o.status === 'delivered').length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        };

        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
