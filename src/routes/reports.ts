import express, { Request, Response } from 'express';
import Order from '../models/Order';
import SalesRecord from '../models/SalesRecord';
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

        // Fetch from SalesRecord (Persistent Data)
        const salesRecords = await SalesRecord.find({
            date: { $gte: start, $lte: end }
        }).sort({ date: -1 });

        // Format the results
        const formattedSales = salesRecords.map(record => {
            const dateStr = record.date.toISOString().split('T')[0];
            return {
                date: dateStr,
                totalOrders: record.totalOrders + (record.cancelledOrders || 0), // Total including cancelled
                totalRevenue: record.totalRevenue,
                deliveredOrders: record.totalOrders,
                cancelledOrders: record.cancelledOrders || 0,
                pendingOrders: 0, // We can't track pending in persistent storage easily, assume 0 for history
                averageOrderValue: record.averageOrderValue,
            };
        });

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

        // Try to get real-time data from Orders first (for pending status)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const orders = await Order.find({
            createdAt: { $gte: today, $lt: tomorrow }
        });

        // Get persistent data
        const salesRecord = await SalesRecord.findOne({ date: today });

        // Merge data - prefer SalesRecord for revenue/delivered/cancelled (persistent)
        // prefer Orders for pending (real-time, transient)
        const stats = {
            totalOrders: (salesRecord?.totalOrders || 0) + (salesRecord?.cancelledOrders || 0) + (orders.filter(o => o.status === 'pending').length),
            totalRevenue: salesRecord?.totalRevenue || 0,
            deliveredOrders: salesRecord?.totalOrders || 0,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            cancelledOrders: salesRecord?.cancelledOrders || 0,
        };

        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
