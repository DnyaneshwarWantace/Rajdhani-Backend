import mongoose from 'mongoose';

/**
 * Recipe Material Model
 * Links recipes to raw materials or other products
 * Defines quantity needed per sqm for each material
 */
const recipeMaterialSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  recipe_id: {
    type: String,
    required: true,
    ref: 'ProductRecipe',
    index: true
  },
  material_id: {
    type: String,
    required: true,
    index: true
  },
  material_name: {
    type: String,
    required: true,
    trim: true
  },
  material_type: {
    type: String,
    required: true,
    enum: ['raw_material', 'product'],
    index: true
  },
  quantity_per_sqm: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  
  // Material specifications
  specifications: {
    type: String,
    trim: true
  },
  quality_requirements: {
    type: String,
    trim: true
  },
  
  // Usage tracking
  is_optional: {
    type: Boolean,
    default: false
  },
  waste_factor: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Percentage
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  collection: 'recipe_materials'
});

// Indexes
recipeMaterialSchema.index({ recipe_id: 1 });
recipeMaterialSchema.index({ material_id: 1 });
recipeMaterialSchema.index({ material_type: 1 });

// Virtual for effective quantity (including waste factor)
recipeMaterialSchema.virtual('effective_quantity_per_sqm').get(function() {
  const wasteMultiplier = 1 + (this.waste_factor / 100);
  return this.quantity_per_sqm * wasteMultiplier;
});

// Ensure virtuals are included in JSON output
recipeMaterialSchema.set('toJSON', { virtuals: true });
recipeMaterialSchema.set('toObject', { virtuals: true });

const RecipeMaterial = mongoose.model('RecipeMaterial', recipeMaterialSchema);

export default RecipeMaterial;
