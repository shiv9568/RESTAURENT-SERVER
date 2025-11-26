import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedPortion?: string; // Added for portion sizes (Half/Full/etc)
}

export interface IOrder extends Document {
  orderNumber: string;
  userId?: string;
  restaurantId?: string;
  restaurantName: string;
  items: IOrderItem[];
  total: number;
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  deliveryFee?: number;
  gst?: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'upi';
  paymentStatus: 'pending' | 'completed' | 'failed';
  deliveryAddress?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  estimatedTime?: string;
  notes?: string;
  orderType: 'delivery' | 'pickup' | 'dine-in';
  tableNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
  selectedPortion: { type: String }, // Added for portion sizes
}, { _id: false });

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true, required: true },
    userId: { type: String },
    restaurantId: { type: String },
    restaurantName: { type: String, required: true },
    items: [OrderItemSchema],
    total: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, min: 0 },
    discount: { type: Number, min: 0 },
    couponCode: { type: String },
    deliveryFee: { type: Number, min: 0 },
    gst: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'online'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    deliveryAddress: { type: String },
    customerName: { type: String },
    customerPhone: { type: String },
    customerEmail: { type: String },
    estimatedTime: { type: String },
    notes: { type: String },
    orderType: {
      type: String,
      enum: ['delivery', 'pickup', 'dine-in'],
      default: 'delivery',
    },
    tableNumber: { type: String },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ userId: 1 });
OrderSchema.index({ restaurantId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

// Generate order number before save
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);
