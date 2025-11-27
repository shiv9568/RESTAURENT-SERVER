import mongoose, { Schema, Document } from 'mongoose';

export interface ISalesRecord extends Document {
    date: Date; // The date for this sales record (stored as start of day)
    restaurantId?: string; // Optional restaurant filter
    totalRevenue: number; // Total revenue for the day
    totalOrders: number; // Number of completed orders
    cancelledOrders: number; // Number of cancelled orders
    totalItems: number; // Total items sold
    averageOrderValue: number; // Average order value
    paymentMethods: {
        cash: number;
        card: number;
        upi: number;
        online: number;
    };
    orderTypes: {
        delivery: number;
        pickup: number;
        dineIn: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SalesRecordSchema = new Schema<ISalesRecord>(
    {
        date: { type: Date, required: true },
        restaurantId: { type: String },
        totalRevenue: { type: Number, required: true, default: 0 },
        totalOrders: { type: Number, required: true, default: 0 },
        cancelledOrders: { type: Number, required: true, default: 0 },
        totalItems: { type: Number, required: true, default: 0 },
        averageOrderValue: { type: Number, required: true, default: 0 },
        paymentMethods: {
            cash: { type: Number, default: 0 },
            card: { type: Number, default: 0 },
            upi: { type: Number, default: 0 },
            online: { type: Number, default: 0 },
        },
        orderTypes: {
            delivery: { type: Number, default: 0 },
            pickup: { type: Number, default: 0 },
            dineIn: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
    }
);

// Create a compound index for efficient querying by date and restaurant
SalesRecordSchema.index({ date: 1, restaurantId: 1 }, { unique: true });
SalesRecordSchema.index({ date: -1 });

export default mongoose.model<ISalesRecord>('SalesRecord', SalesRecordSchema);
