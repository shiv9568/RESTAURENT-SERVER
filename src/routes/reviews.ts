import express, { Request, Response } from 'express';
import { Review } from '../models/Review';
import FoodItem from '../models/FoodItem';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to check auth
function authMiddleware(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        (req as any).user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// GET reviews for a food item
router.get('/:foodId', async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ foodItem: req.params.foodId })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST a review
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { foodItem, rating, comment } = req.body;
        const userId = (req as any).user.userId;

        // Check if user already reviewed this item
        const existingReview = await Review.findOne({ user: userId, foodItem });
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this item' });
        }

        const review = new Review({
            user: userId,
            foodItem,
            rating,
            comment
        });

        await review.save();

        // Update average rating
        const stats = await Review.aggregate([
            { $match: { foodItem: new mongoose.Types.ObjectId(foodItem) } },
            { $group: { _id: '$foodItem', avgRating: { $avg: '$rating' } } }
        ]);

        if (stats.length > 0) {
            await FoodItem.findByIdAndUpdate(foodItem, { rating: stats[0].avgRating });
        }

        const populatedReview = await Review.findById(review._id).populate('user', 'name avatar');
        res.status(201).json(populatedReview);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
