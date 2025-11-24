import express, { Request, Response } from 'express';
import Restaurant from '../models/Restaurant';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const doc = await Restaurant.findOne();
    res.json(doc || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const update = req.body || {};
    const doc = await Restaurant.findOneAndUpdate({}, update, { new: true, upsert: true });
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
