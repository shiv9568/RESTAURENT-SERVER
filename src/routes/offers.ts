import express, { Request, Response } from 'express';
import Offer from '../models/Offer';

const router = express.Router();

// GET all offers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const offers = await Offer.find(filter).sort({ createdAt: -1 });
    res.json(offers.map(offer => ({
      ...offer.toObject(),
      id: offer._id.toString(),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single offer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json({
      ...offer.toObject(),
      id: offer._id.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create offer
router.post('/', async (req: Request, res: Response) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json({
      ...offer.toObject(),
      id: offer._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update offer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json({
      ...offer.toObject(),
      id: offer._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE offer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

