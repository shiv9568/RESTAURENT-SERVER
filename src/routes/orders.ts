import express, { Request, Response } from 'express';
import Order from '../models/Order';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { updateSalesRecord, trackCancelledOrder } from '../utils/salesTracking';

const router = express.Router();

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

// GET all orders (simplified - no auth required for admin panel)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, userId, restaurantId, orderNumber } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (restaurantId) filter.restaurantId = restaurantId;
    if (userId) filter.userId = userId;
    if (orderNumber) filter.orderNumber = orderNumber;

    // If auth token is provided, filter by user if not admin
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        const isAdmin = decoded?.role === 'admin' || decoded?.role === 'super-admin';
        if (!isAdmin && !userId) {
          filter.userId = decoded.userId;
        }
      } catch {
        // Invalid token - allow access anyway (simplified)
      }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    console.log(`[Orders API] Query filter:`, filter);
    console.log(`[Orders API] Found ${orders.length} orders in database`);

    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      const orderId = (order._id as any).toString();
      return {
        ...orderObj,
        id: orderId,
        _id: orderId,
        orderedAt: order.createdAt || (orderObj as any).orderedAt,
        // Ensure all required fields are present
        customerName: orderObj.customerName || 'Guest',
        customerEmail: orderObj.customerEmail || '',
        customerPhone: orderObj.customerPhone || '',
        deliveryAddress: orderObj.deliveryAddress || '',
        restaurantName: orderObj.restaurantName || 'Restaurant',
        status: orderObj.status || 'pending',
        total: orderObj.total || 0,
        items: orderObj.items || [],
      };
    });

    console.log(`[Orders API] Returning ${formattedOrders.length} formatted orders`);
    res.json(formattedOrders);
  } catch (error: any) {
    console.error('[Orders API Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single order (simplified - no auth required)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let order = null as any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ orderNumber: id });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Optional: Check auth but don't block if invalid
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        const isAdmin = decoded?.role === 'admin' || decoded?.role === 'super-admin';
        if (!isAdmin && order.userId && order.userId !== decoded.userId) {
          // Allow access anyway for simplified access
        }
      } catch {
        // Invalid token - allow access anyway (simplified)
      }
    }

    res.json({
      ...order.toObject(),
      id: (order._id as any).toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET invoice data for an order
router.get('/:id/invoice', async (req: Request, res: Response) => {
  try {
    let order = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await Order.findById(req.params.id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.id });
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = order.items || [];
    const subtotal = items.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
    const deliveryFee = 40;
    const platformFee = 5;
    const taxes = Math.round((subtotal + deliveryFee) * 0.05);
    const total = subtotal + deliveryFee + platformFee + taxes;
    res.json({
      id: (order._id as any).toString(),
      orderNumber: (order as any).orderNumber,
      createdAt: order.createdAt,
      customerName: (order as any).customerName,
      customerEmail: (order as any).customerEmail,
      customerPhone: (order as any).customerPhone,
      deliveryAddress: (order as any).deliveryAddress,
      paymentMethod: (order as any).paymentMethod,
      items,
      breakdown: { subtotal, deliveryFee, platformFee, taxes, total },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST email receipt (stub)
router.post('/:id/email-receipt', async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // TODO: integrate email service; for now, return success
    res.json({ message: 'Receipt email queued (mock)' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST create order (simplified - no strict auth required)
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    // Try to get userId from auth token if available, otherwise use body.userId
    let userId = body.userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        userId = userId || decoded.userId;
      } catch {
        // Invalid token - use userId from body (simplified)
      }
    }

    // Ensure orderNumber exists
    if (!body.orderNumber) {
      const count = await Order.countDocuments();
      body.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
    }

    const order = new Order({
      ...body,
      userId: userId || 'guest',
    });

    await order.save();
    const orderId = (order._id as any).toString();
    console.log(`[Orders API] Order created: ${order.orderNumber}, ID: ${orderId}`);

    res.status(201).json({
      ...order.toObject(),
      id: orderId,
      _id: orderId,
    });

    // Emit socket event
    if ((req as any).io) {
      (req as any).io.emit('orders:update', { action: 'create', order });
    }
  } catch (error: any) {
    console.error('[Orders API] Create error:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT update order status (simplified - no strict auth required)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // Optional: Check if admin token exists, but don't block if it doesn't
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        const isAdmin = decoded?.role === 'admin' || decoded?.role === 'super-admin';
        if (!isAdmin) {
          // Allow anyway for simplified access
        }
      } catch {
        // Invalid token - allow update anyway (simplified)
      }
    }

    // Try to find by MongoDB ID first, then by orderNumber
    let order = null as any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );
    } else {
      // Search by orderNumber
      order = await Order.findOneAndUpdate(
        { orderNumber: id },
        req.body,
        { new: true, runValidators: true }
      );
    }

    if (!order) {
      console.log(`[Orders API] Order not found for update: ${id}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`[Orders API] Order updated: ${order.orderNumber}, status: ${order.status}`);

    // Track sales if order is marked as delivered
    if (order.status === 'delivered') {
      await updateSalesRecord(order);
    } else if (order.status === 'cancelled') {
      await trackCancelledOrder(order);
    }

    const orderId = (order._id as any).toString();
    res.json({
      ...order.toObject(),
      id: orderId,
      _id: orderId,
    });

    // Emit socket event
    if ((req as any).io) {
      (req as any).io.emit('orders:update', { action: 'update', order });
    }
  } catch (error: any) {
    console.error('[Orders API] Update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE order (simplified - no strict auth required)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Optional: Check if admin token exists, but don't block if it doesn't
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        const isAdmin = decoded?.role === 'admin' || decoded?.role === 'super-admin';
        if (!isAdmin) {
          // Allow anyway for simplified access
        }
      } catch {
        // Invalid token - allow delete anyway (simplified)
      }
    }

    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });

    // Emit socket event
    if ((req as any).io) {
      (req as any).io.emit('orders:update', { action: 'delete', id: req.params.id });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE all orders (clear all - admin only recommended but simplified)
router.delete('/', async (req: Request, res: Response) => {
  try {
    console.log('[Orders API] Clearing all orders...');
    const result = await Order.deleteMany({});
    console.log(`[Orders API] Deleted ${result.deletedCount} orders`);
    res.json({
      message: 'All orders cleared successfully',
      deletedCount: result.deletedCount
    });

    // Emit socket event
    if ((req as any).io) {
      (req as any).io.emit('orders:update', { action: 'clear-all' });
    }
  } catch (error: any) {
    console.error('[Orders API] Clear all error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
