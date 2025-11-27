import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import SalesRecord from '../models/SalesRecord';
import {
    getSalesData,
    getMonthlySales,
    rebuildSalesRecords
} from '../utils/salesTracking';

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

// GET /api/sales/daily - Get daily sales data
router.get('/daily', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, restaurantId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        const sales = await getSalesData(start, end, restaurantId as string);

        res.json({
            success: true,
            data: sales,
            summary: {
                totalRevenue: sales.reduce((sum, record) => sum + record.totalRevenue, 0),
                totalOrders: sales.reduce((sum, record) => sum + record.totalOrders, 0),
                totalItems: sales.reduce((sum, record) => sum + record.totalItems, 0),
                daysWithSales: sales.length,
            },
        });
    } catch (error: any) {
        console.error('[Sales API] Daily sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sales/monthly - Get monthly sales summary
router.get('/monthly', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { year, month, restaurantId } = req.query;

        if (!year || !month) {
            return res.status(400).json({ error: 'year and month are required' });
        }

        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string);

        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }

        const monthlySales = await getMonthlySales(yearNum, monthNum, restaurantId as string);

        res.json({
            success: true,
            data: monthlySales,
        });
    } catch (error: any) {
        console.error('[Sales API] Monthly sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sales/today - Get today's sales
router.get('/today', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.query;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filter: any = { date: today };
        if (restaurantId) {
            filter.restaurantId = restaurantId;
        }

        const todaySales = await SalesRecord.findOne(filter);

        res.json({
            success: true,
            data: todaySales || {
                date: today,
                totalRevenue: 0,
                totalOrders: 0,
                totalItems: 0,
                averageOrderValue: 0,
            },
        });
    } catch (error: any) {
        console.error('[Sales API] Today sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sales/this-month - Get this month's sales
router.get('/this-month', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.query;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const monthlySales = await getMonthlySales(year, month, restaurantId as string);

        res.json({
            success: true,
            data: monthlySales,
        });
    } catch (error: any) {
        console.error('[Sales API] This month sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sales/rebuild - Rebuild sales records from existing orders
router.post('/rebuild', requireAdmin, async (req: Request, res: Response) => {
    try {
        await rebuildSalesRecords();
        res.json({
            success: true,
            message: 'Sales records rebuilt successfully',
        });
    } catch (error: any) {
        console.error('[Sales API] Rebuild error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sales/stats - Get overall sales statistics
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.query;

        const filter: any = {};
        if (restaurantId) {
            filter.restaurantId = restaurantId;
        }

        // Get all-time stats
        const allRecords = await SalesRecord.find(filter);

        const allTimeRevenue = allRecords.reduce((sum, record) => sum + record.totalRevenue, 0);
        const allTimeOrders = allRecords.reduce((sum, record) => sum + record.totalOrders, 0);
        const allTimeItems = allRecords.reduce((sum, record) => sum + record.totalItems, 0);

        // Get this month's stats
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const thisMonthFilter = { ...filter, date: { $gte: thisMonthStart } };
        const thisMonthRecords = await SalesRecord.find(thisMonthFilter);

        const thisMonthRevenue = thisMonthRecords.reduce((sum, record) => sum + record.totalRevenue, 0);
        const thisMonthOrders = thisMonthRecords.reduce((sum, record) => sum + record.totalOrders, 0);

        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayFilter = { ...filter, date: today };
        const todayRecord = await SalesRecord.findOne(todayFilter);

        res.json({
            success: true,
            data: {
                allTime: {
                    totalRevenue: allTimeRevenue,
                    totalOrders: allTimeOrders,
                    totalItems: allTimeItems,
                    averageOrderValue: allTimeOrders > 0 ? allTimeRevenue / allTimeOrders : 0,
                },
                thisMonth: {
                    totalRevenue: thisMonthRevenue,
                    totalOrders: thisMonthOrders,
                    averageOrderValue: thisMonthOrders > 0 ? thisMonthRevenue / thisMonthOrders : 0,
                },
                today: {
                    totalRevenue: todayRecord?.totalRevenue || 0,
                    totalOrders: todayRecord?.totalOrders || 0,
                    totalItems: todayRecord?.totalItems || 0,
                    averageOrderValue: todayRecord?.averageOrderValue || 0,
                },
            },
        });
    } catch (error: any) {
        console.error('[Sales API] Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
