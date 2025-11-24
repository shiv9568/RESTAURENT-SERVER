import express, { Request, Response } from 'express';
import Category from '../models/Category';
import FoodItem from '../models/FoodItem';

const router = express.Router();

// GET all categories with their items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { displayOnHomepage } = req.query;
    const filter: any = {};
    if (displayOnHomepage !== undefined) {
      filter.displayOnHomepage = displayOnHomepage === 'true';
    }

    const categories = await Category.find(filter).sort({ name: 1 });

    // Get items for each category
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const categoryId = category._id.toString();
        // Query items by categoryId (exact match) OR by category name (fallback)
        const items = await FoodItem.find({
          $or: [
            { categoryId: categoryId },
            { category: category.name }
          ]
        });
        console.log(`Category ${category.name} (${categoryId}): Found ${items.length} items`);
        if (items.length > 0) {
          console.log(`Items for ${category.name}:`, items.map(i => ({ id: i._id.toString(), name: i.name, categoryId: i.categoryId, category: i.category })));
        }
        return {
          ...category.toObject(),
          id: categoryId,
          items: items.map(item => ({
            ...item.toObject(),
            id: item._id.toString(),
          })),
        };
      })
    );

    res.json(categoriesWithItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single category with items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const items = await FoodItem.find({ categoryId: req.params.id });
    res.json({
      ...category.toObject(),
      id: category._id.toString(),
      items: items.map(item => ({
        ...item.toObject(),
        id: item._id.toString(),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create category
router.post('/', async (req: Request, res: Response) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({
      ...category.toObject(),
      id: category._id.toString(),
      items: [],
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const items = await FoodItem.find({ categoryId: req.params.id });
    res.json({
      ...category.toObject(),
      id: category._id.toString(),
      items: items.map(item => ({
        ...item.toObject(),
        id: item._id.toString(),
      })),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Also delete all items in this category
    await FoodItem.deleteMany({ categoryId: req.params.id });
    res.json({ message: 'Category and its items deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default categories
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const defaultCategories = [
      { name: 'Appetizers', description: 'Starters & Snacks', icon: '🍤', displayOnHomepage: true },
      { name: 'Main Course', description: 'Rice, Roti & Curries', icon: '🍛', displayOnHomepage: true },
      { name: 'Fast Food', description: 'Burgers, Pizza & More', icon: '🍔', displayOnHomepage: true },
      { name: 'Beverages', description: 'Drinks & Juices', icon: '🥤', displayOnHomepage: true },
      { name: 'Desserts', description: 'Sweet Treats', icon: '🍰', displayOnHomepage: true },
      { name: 'Breads', description: 'Naan, Roti & Paratha', icon: '🥖', displayOnHomepage: true },
      { name: 'Soups', description: 'Hot & Healthy Soups', icon: '🍲', displayOnHomepage: false },
      { name: 'Salads', description: 'Fresh & Healthy', icon: '🥗', displayOnHomepage: false },
    ];

    const existingCategories = await Category.find({});
    if (existingCategories.length > 0) {
      return res.json({ message: 'Categories already initialized', categories: existingCategories });
    }

    const categories = await Category.insertMany(defaultCategories);
    res.status(201).json({ message: 'Categories initialized successfully', categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

