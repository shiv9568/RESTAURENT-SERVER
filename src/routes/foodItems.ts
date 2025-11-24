import express, { Request, Response } from 'express';
import FoodItem from '../models/FoodItem';

const router = express.Router();

// GET all food items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, categoryId, displayOnHomepage, isAvailable } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (categoryId) filter.categoryId = categoryId;
    if (displayOnHomepage !== undefined) filter.displayOnHomepage = displayOnHomepage === 'true';
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

    console.log('Fetching food items with filter:', filter);
    const items = await FoodItem.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${items.length} food items`);
    res.json(items.map(item => ({
      ...item.toObject(),
      id: item._id.toString(),
    })));
  } catch (error: any) {
    console.error('Error fetching food items:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single food item
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json({
      ...item.toObject(),
      id: item._id.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create food item
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Creating food item with data:', req.body);
    console.log('CategoryId in request:', req.body.categoryId);
    const item = new FoodItem(req.body);
    await item.save();
    console.log('Food item saved successfully:', {
      id: item._id.toString(),
      name: item.name,
      categoryId: item.categoryId,
      category: item.category
    });
    res.status(201).json({
      ...item.toObject(),
      id: item._id.toString(),
    });
  } catch (error: any) {
    console.error('Error creating food item:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT update food item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const item = await FoodItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json({
      ...item.toObject(),
      id: item._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE food item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const item = await FoodItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json({ message: 'Food item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

