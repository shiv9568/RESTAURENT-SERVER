import express, { Request, Response } from 'express';
import FoodItem from '../models/FoodItem';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const lowerMsg = message.toLowerCase();
        const query: any = { isAvailable: true };
        const sort: any = {};

        // 1. Price Analysis
        const priceMatch = lowerMsg.match(/(?:under|below|less than|<)\s*₹?(\d+)/);
        const priceMatchOver = lowerMsg.match(/(?:over|above|more than|>)\s*₹?(\d+)/);

        if (priceMatch) {
            query.price = { ...query.price, $lte: parseInt(priceMatch[1]) };
        }
        if (priceMatchOver) {
            query.price = { ...query.price, $gte: parseInt(priceMatchOver[1]) };
        }

        if (lowerMsg.includes('cheap') || lowerMsg.includes('budget')) {
            query.price = { ...query.price, $lte: 200 };
            sort.price = 1;
        }
        if (lowerMsg.includes('expensive') || lowerMsg.includes('premium')) {
            sort.price = -1;
        }

        // 2. Dietary Preferences
        if (lowerMsg.includes('veg') && !lowerMsg.includes('non-veg')) {
            query.isVeg = true;
        } else if (lowerMsg.includes('non-veg') || lowerMsg.includes('chicken') || lowerMsg.includes('meat') || lowerMsg.includes('fish')) {
            query.isVeg = false;
        }

        // 3. Keyword Extraction (Simple)
        // Remove common stop words to find potential food names/categories
        const stopWords = ['i', 'want', 'need', 'something', 'some', 'food', 'dish', 'under', 'below', 'above', 'over', 'less', 'more', 'than', 'is', 'are', 'a', 'an', 'the', 'please', 'show', 'me', 'can', 'you', 'find', 'looking', 'for', 'with', 'in', 'at', 'rs', 'rupees', 'price', 'cost'];

        const words = lowerMsg.split(/\s+/).filter((w: string) => !stopWords.includes(w) && !w.match(/^\d+$/));

        if (words.length > 0) {
            // Create a regex that matches ANY of the keywords in name, description, or category
            const keywordRegex = words.map((w: string) => new RegExp(w, 'i'));

            query.$or = [
                { name: { $in: keywordRegex } },
                { description: { $in: keywordRegex } },
                { category: { $in: keywordRegex } }
            ];
        }

        // Execute Query
        const items = await FoodItem.find(query).sort(sort).limit(5);

        // Construct Response
        let responseText = '';
        if (items.length === 0) {
            responseText = "I couldn't find anything matching your exact request. Try broadening your search?";
        } else {
            const names = items.map(i => i.name).join(', ');
            responseText = `I found some delicious options for you: ${names}. Would you like to add any to your cart?`;
        }

        res.json({
            message: responseText,
            items: items
        });

    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process your request' });
    }
});

export default router;
