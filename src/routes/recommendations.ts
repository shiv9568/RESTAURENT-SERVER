import express from 'express';
import Order from '../models/Order';
import mongoose from 'mongoose';

const router = express.Router();

// Get frequently bought together items for a specific item ID
router.get('/frequently-bought-together/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;

        if (!itemId) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        const recommendations = await Order.aggregate([
            // 1. Find all orders that contain the target item
            { $match: { "items.itemId": itemId } },

            // 2. Unwind the items array to process individual items
            { $unwind: "$items" },

            // 3. Filter out the target item itself (we don't want to recommend the same item)
            { $match: { "items.itemId": { $ne: itemId } } },

            // 4. Group by item ID and count occurrences
            {
                $group: {
                    _id: "$items.itemId",
                    count: { $sum: 1 }
                }
            },

            // 5. Sort by frequency (descending)
            { $sort: { count: -1 } },

            // 6. Limit to top 3 recommendations
            { $limit: 3 },

            // 7. Lookup current item details to ensure validity and get up-to-date info
            {
                $lookup: {
                    from: 'fooditems',
                    let: { itemId: { $toObjectId: "$_id" } }, // Convert string ID to ObjectId for lookup
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$itemId"] } } }
                    ],
                    as: 'details'
                }
            },

            // 8. Unwind details (if item not found, it will be removed)
            { $unwind: "$details" },

            // 9. Project final shape
            {
                $project: {
                    _id: "$details._id",
                    name: "$details.name",
                    price: "$details.price",
                    image: "$details.image",
                    isVeg: "$details.isVeg",
                    restaurantId: "$details.restaurantId",
                    frequency: "$count"
                }
            }
        ]);

        // Format the output
        const formattedRecommendations = recommendations.map(rec => ({
            id: rec._id,
            name: rec.name,
            price: rec.price,
            image: rec.image,
            isVeg: rec.isVeg,
            restaurantId: rec.restaurantId,
            frequency: rec.frequency
        }));

        res.json(formattedRecommendations);

    } catch (error: any) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

export default router;
