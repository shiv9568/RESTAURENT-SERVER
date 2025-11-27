import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemNotification extends Document {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    active: boolean;
    createdAt: Date;
    expiresAt?: Date;
}

const SystemNotificationSchema = new Schema<ISystemNotification>({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
});

export default mongoose.model<ISystemNotification>('SystemNotification', SystemNotificationSchema);
