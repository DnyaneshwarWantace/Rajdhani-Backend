import mongoose from 'mongoose';

/**
 * Product Recipe Model
 * Links products to their recipes (defined for 1 sqm)
 * Each product can have one recipe that defines materials needed per sqm
 */
const productRecipeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  product_id: {
    type: String,
    required: true,
    ref: 'Product',
    index: true
  },
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  base_unit: {
    type: String,
    required: true,
    default: 'sqm',
    enum: ['sqm', 'sqft', 'piece', 'roll']
  },
  created_by: {
    type: String,
    required: true,
    trim: true
  },
  
  // Recipe metadata
  description: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    default: '1.0',
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'product_recipes'
});

// Indexes
productRecipeSchema.index({ product_id: 1 });
productRecipeSchema.index({ created_by: 1 });
productRecipeSchema.index({ is_active: 1 });

// Virtual for materials count
productRecipeSchema.virtual('materials_count').get(function() {
  return this.materials ? this.materials.length : 0;
});

// Ensure virtuals are included in JSON output
productRecipeSchema.set('toJSON', { virtuals: true });
productRecipeSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update timestamps
productRecipeSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const ProductRecipe = mongoose.model('ProductRecipe', productRecipeSchema);

export default ProductRecipe;
