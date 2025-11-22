import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  icon?: string;
  displayOnHomepage: boolean;
  restaurantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    displayOnHomepage: { type: Boolean, default: true },
    restaurantId: { type: String },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ displayOnHomepage: 1 });

export default mongoose.model<ICategory>('Category', CategorySchema);

