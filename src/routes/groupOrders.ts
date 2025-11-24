import express, { Request, Response } from 'express';
import GroupOrder from '../models/GroupOrder.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Middleware to check auth (optional for joining, required for creating)
function authMiddleware(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
            (req as any).user = decoded;
        } catch {
            // Invalid token, proceed as guest
        }
    }
    next();
}

// Create a new group order
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'You must be logged in to create a group order' });
        }

        const { deadline } = req.body;
        const code = uuidv4().substring(0, 8); // Short unique code

        const groupOrder = new GroupOrder({
            code,
            creator: userId,
            participants: [{ name: (req as any).user.name || 'Host', userId, joinedAt: new Date() }],
            items: [],
            status: 'active'
        });

        await groupOrder.save();
        res.status(201).json(groupOrder);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Get group order by code (or ID)
router.get('/:code', async (req: Request, res: Response) => {
    try {
        const groupOrder = await GroupOrder.findOne({ code: req.params.code })
            .populate('creator', 'name')
            .populate('items.foodItem');

        if (!groupOrder) {
            return res.status(404).json({ error: 'Group order not found' });
        }
        res.json(groupOrder);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Join group order
router.post('/:code/join', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const userId = (req as any).user?.userId;
        const userName = name || (req as any).user?.name || 'Guest';

        const groupOrder = await GroupOrder.findOne({ code: req.params.code });
        if (!groupOrder) return res.status(404).json({ error: 'Group order not found' });

        // Check if already joined
        const existingParticipant = groupOrder.participants.find(p =>
            (userId && p.userId?.toString() === userId) || p.name === userName
        );

        if (!existingParticipant) {
            groupOrder.participants.push({
                name: userName,
                userId: userId || undefined,
                joinedAt: new Date()
            });
            await groupOrder.save();

            // Emit socket event
            if ((req as any).io) {
                (req as any).io.to(`group_${req.params.code}`).emit('group_updated', groupOrder);
            }
        }

        res.json(groupOrder);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Add item to group order
router.post('/:code/items', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { foodItemId, name, price, quantity, addedBy } = req.body;

        const groupOrder = await GroupOrder.findOne({ code: req.params.code });
        if (!groupOrder) return res.status(404).json({ error: 'Group order not found' });
        if (groupOrder.status !== 'active') return res.status(400).json({ error: 'Group order is closed' });

        groupOrder.items.push({
            foodItem: foodItemId,
            name,
            price,
            quantity: quantity || 1,
            addedBy: addedBy || 'Guest',
            addedAt: new Date()
        });

        await groupOrder.save();

        // Emit socket event
        if ((req as any).io) {
            (req as any).io.to(`group_${req.params.code}`).emit('group_updated', groupOrder);
        }

        res.json(groupOrder);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Remove item
router.delete('/:code/items/:itemId', async (req: Request, res: Response) => {
    try {
        const groupOrder = await GroupOrder.findOne({ code: req.params.code });
        if (!groupOrder) return res.status(404).json({ error: 'Group order not found' });

        groupOrder.items = groupOrder.items.filter(item => item._id.toString() !== req.params.itemId);
        await groupOrder.save();

        // Emit socket event
        if ((req as any).io) {
            (req as any).io.to(`group_${req.params.code}`).emit('group_updated', groupOrder);
        }

        res.json(groupOrder);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
