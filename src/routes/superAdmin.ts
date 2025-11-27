import express from 'express';
import Restaurant from '../models/Restaurant';
import FoodItem from '../models/FoodItem';
import User from '../models/User';
import SystemNotification from '../models/SystemNotification';

const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const totalRestaurants = await Restaurant.countDocuments();
        const totalFoodItems = await FoodItem.countDocuments();
        const totalUsers = await User.countDocuments();

        // Calculate growth (mock logic for now, or real if we query by date)
        // Real implementation would be: count documents created > 30 days ago vs now
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - 7));

        const newRestaurantsMonth = await Restaurant.countDocuments({ createdAt: { $gte: startOfMonth } });
        const newFoodItemsWeek = await FoodItem.countDocuments({ createdAt: { $gte: startOfWeek } });
        const newUsersMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

        res.json({
            restaurants: { total: totalRestaurants, growth: newRestaurantsMonth },
            foodItems: { total: totalFoodItems, growth: newFoodItemsWeek },
            users: { total: totalUsers, growth: newUsersMonth }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

router.get('/activities', async (req, res) => {
    try {
        // Fetch latest 5 from each and merge/sort
        const latestRestaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(3).lean();
        const latestFoodItems = await FoodItem.find().sort({ createdAt: -1 }).limit(3).lean();
        const latestUsers = await User.find().sort({ createdAt: -1 }).limit(3).lean();

        const activities = [
            ...latestRestaurants.map(r => ({
                type: 'restaurant',
                message: `New restaurant registered: ${r.name}`,
                time: r.createdAt
            })),
            ...latestFoodItems.map(f => ({
                type: 'food',
                message: `New menu item added: ${f.name}`,
                time: f.createdAt
            })),
            ...latestUsers.map(u => ({
                type: 'user',
                message: `New user joined: ${u.name}`,
                time: u.createdAt
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Error fetching activities' });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        const notifications = await SystemNotification.find({ active: true })
            .sort({ createdAt: -1 })
            .limit(5);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

router.post('/notifications', async (req, res) => {
    try {
        const { title, message, type, expiresAt } = req.body;
        const notification = new SystemNotification({ title, message, type, expiresAt });
        await notification.save();

        // Emit socket event
        const io = (req as any).io;
        if (io) {
            io.emit('system_notification', notification);
        }

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification' });
    }
});

export default router;
