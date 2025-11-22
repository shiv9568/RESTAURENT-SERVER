import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryZone extends Document {
  name: string;
  description: string;
  deliveryFee: number;
  minOrderAmount: number;
  estimatedTime: string;
  isActive: boolean;
  coordinates: {
    lat: number;
    lng: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    deliveryFee: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, required: true, min: 0 },
    estimatedTime: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    coordinates: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    }],
  },
  {
    timestamps: true,
  }
);

DeliveryZoneSchema.index({ isActive: 1 });

export default mongoose.model<IDeliveryZone>('DeliveryZone', DeliveryZoneSchema);

