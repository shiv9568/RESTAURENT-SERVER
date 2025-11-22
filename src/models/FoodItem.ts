import mongoose, { Schema, Document } from 'mongoose';

export interface IFoodItem extends Document {
  name: string;
  description?: string;
  price: number;
  image: string;
  category: string;
  categoryId?: string;
  isVeg: boolean;
  isAvailable: boolean;
  displayOnHomepage?: boolean;
  rating?: number;
  restaurantId?: string;
  portionSizes?: Array<{ name: string; price: number }>;
  parentId?: string; // Reference to parent item if this is a sub-item
  isParent?: boolean; // True if this item has sub-items
  createdAt: Date;
  updatedAt: Date;
}

const FoodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '/placeholder.svg' },
    category: { type: String, required: true },
    categoryId: { type: String },
    isVeg: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    displayOnHomepage: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    restaurantId: { type: String },
    portionSizes: [{
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 }
    }],
    parentId: { type: String }, // Reference to parent item
    isParent: { type: Boolean, default: false }, // True if has sub-items
  },
  {
    timestamps: true,
  }
);

FoodItemSchema.index({ category: 1 });
FoodItemSchema.index({ categoryId: 1 });
FoodItemSchema.index({ displayOnHomepage: 1, isAvailable: 1 });
FoodItemSchema.index({ parentId: 1 }); // Index for querying sub-items

export default mongoose.model<IFoodItem>('FoodItem', FoodItemSchema);
