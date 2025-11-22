import express, { Request, Response } from 'express';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();

// GET all restaurants
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
    res.json(restaurants.map(restaurant => ({
      ...restaurant.toObject(),
      id: restaurant._id.toString(),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single restaurant
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json({
      ...restaurant.toObject(),
      id: restaurant._id.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create restaurant
router.post('/', async (req: Request, res: Response) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.status(201).json({
      ...restaurant.toObject(),
      id: restaurant._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update restaurant
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json({
      ...restaurant.toObject(),
      id: restaurant._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE restaurant
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

