import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemLog extends Document {
    level: 'info' | 'warn' | 'error';
    message: string;
    details?: any;
    service: string;
    timestamp: Date;
    resolved: boolean;
}

const SystemLogSchema = new Schema<ISystemLog>({
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'error' },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    service: { type: String, default: 'backend' },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
});

export default mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
