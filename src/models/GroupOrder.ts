import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupOrder extends Document {
    code: string;
    creator: mongoose.Types.ObjectId;
    participants: Array<{
        name: string;
        userId?: mongoose.Types.ObjectId;
        joinedAt: Date;
    }>;
    items: Array<{
        foodItem: mongoose.Types.ObjectId;
        name: string;
        price: number;
        quantity: number;
        addedBy: string; // Name of the participant
        addedAt: Date;
    }>;
    status: 'active' | 'closed' | 'ordered';
    createdAt: Date;
    updatedAt: Date;
}

const GroupOrderSchema = new Schema<IGroupOrder>(
    {
        code: { type: String, required: true, unique: true },
        creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        participants: [{
            name: { type: String, required: true },
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            joinedAt: { type: Date, default: Date.now }
        }],
        items: [{
            foodItem: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, default: 1 },
            addedBy: { type: String, required: true },
            addedAt: { type: Date, default: Date.now }
        }],
        status: { type: String, enum: ['active', 'closed', 'ordered'], default: 'active' }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IGroupOrder>('GroupOrder', GroupOrderSchema);
