import express, { Request, Response } from 'express';
import DeliveryZone from '../models/DeliveryZone';

const router = express.Router();

// GET all delivery zones
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const zones = await DeliveryZone.find(filter).sort({ name: 1 });
    res.json(zones.map(zone => ({
      ...zone.toObject(),
      id: zone._id.toString(),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single delivery zone
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const zone = await DeliveryZone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }
    res.json({
      ...zone.toObject(),
      id: zone._id.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create delivery zone
router.post('/', async (req: Request, res: Response) => {
  try {
    const zone = new DeliveryZone(req.body);
    await zone.save();
    res.status(201).json({
      ...zone.toObject(),
      id: zone._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update delivery zone
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const zone = await DeliveryZone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!zone) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }
    res.json({
      ...zone.toObject(),
      id: zone._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE delivery zone
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
    if (!zone) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }
    res.json({ message: 'Delivery zone deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

