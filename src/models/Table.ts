import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  tableNumber: string;
  capacity?: number;
  status: 'available' | 'occupied' | 'reserved';
  qrCodeUrl?: string; // Optional: if we want to store the generated URL
  currentSessionToken?: string; // Dynamic daily token for security
  restaurantId?: string; // If multi-tenant
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    tableNumber: { type: String, required: true, unique: true },
    capacity: { type: Number, default: 2 },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    qrCodeUrl: { type: String },
    currentSessionToken: { type: String },
    restaurantId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITable>('Table', TableSchema);
