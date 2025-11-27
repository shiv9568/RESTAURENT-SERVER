import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  logo?: string;
  about?: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
  contactNumber?: string;
  deliveryZones?: string[];
  isClosed?: boolean;
  createdAt: Date;
  updatedAt: Date;
  isCouponsEnabled?: boolean;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    logo: { type: String },
    about: { type: String },
    address: { type: String },
    openTime: { type: String },
    closeTime: { type: String },
    contactNumber: { type: String },
    deliveryZones: [{ type: String }],
    isClosed: { type: Boolean, default: false },
    isCouponsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);

