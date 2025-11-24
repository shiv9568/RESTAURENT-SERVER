import express, { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to check JWT
function authMiddleware(req: Request, res: Response, next: any) {
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

// Helper: require admin middleware
function requireAdmin(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
    if (decoded?.role !== 'admin' && decoded?.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET all users (admin only)
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users.map(user => ({
      ...user.toObject(),
      id: user._id.toString(),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile (MUST be before /:id route)
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requester: any = (req as any).user;
    const user = await User.findById(requester.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      ...user.toObject(),
      id: user._id.toString(),
      mobile: user.phone || '', // Map phone to mobile
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update current user profile (MUST be before /:id route)
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requester: any = (req as any).user;
    const { name, email, mobile, phone } = req.body;

    // Use mobile or phone (mobile takes precedence)
    const phoneNumber = mobile || phone;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phone = phoneNumber;

    const user = await User.findByIdAndUpdate(
      requester.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user.toObject(),
      id: user._id.toString(),
      mobile: user.phone || '', // Map phone to mobile
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET single user
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requester: any = (req as any).user;
    if (requester.role !== 'admin' && requester.role !== 'super-admin' && requester.userId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      ...user.toObject(),
      id: user._id.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update user
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requester: any = (req as any).user;
    if (requester.role !== 'admin' && requester.role !== 'super-admin' && requester.userId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Don't allow password updates through this route
    const { password, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      ...user.toObject(),
      id: user._id.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Address CRUD (all require auth)
router.get('/:id/addresses', authMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id).select('addresses');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.addresses ?? []);
});

router.post('/:id/addresses', authMiddleware, async (req, res) => {
  const address = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!address.id) address.id = Math.random().toString(36).substring(2, 12);
  if (address.isDefault) user.addresses.forEach(a => a.isDefault = false);
  user.addresses.push(address);
  await user.save();
  res.status(201).json(user.addresses);
});

router.put('/:id/addresses/:addressId', authMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const idx = user.addresses.findIndex(a => a.id === req.params.addressId);
  if (idx === -1) return res.status(404).json({ error: 'Address not found' });
  const update = req.body;
  if (update.isDefault) user.addresses.forEach(a => a.isDefault = false);
  Object.assign(user.addresses[idx], update);
  await user.save();
  res.json(user.addresses);
});

router.delete('/:id/addresses/:addressId', authMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.addresses = user.addresses.filter(a => a.id !== req.params.addressId);
  await user.save();
  res.json(user.addresses);
});

export default router;

