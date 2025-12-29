import mongoose from 'mongoose';

const rawMaterialSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  current_stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reserved_stock: {
    type: Number,
    default: 0,
    min: 0
  },
  in_production: {
    type: Number,
    default: 0,
    min: 0
  },
  sold: {
    type: Number,
    default: 0,
    min: 0
  },
  used: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    enum: ['kg', 'liters', 'rolls', 'meters', 'sqm', 'pieces', 'boxes', 'L', 'gallons', 'pounds', 'yards', 'tons']
  },
  min_threshold: {
    type: Number,
    required: true,
    default: 0
  },
  max_capacity: {
    type: Number,
    required: true
  },
  reorder_point: {
    type: Number,
    required: true
  },
  daily_usage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'overstock', 'in-transit'],
    default: 'in-stock'
  },
  supplier_id: {
    type: String
  },
  supplier_name: {
    type: String,
    required: true,
    trim: true
  },
  cost_per_unit: {
    type: Number,
    required: true,
    min: 0
  },
  total_value: {
    type: Number,
    default: 0
  },
  batch_number: {
    type: String,
    trim: true
  },
  quality_grade: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  image_url: {
    type: String,
    trim: true
  },
  supplier_performance: {
    type: Number,
    default: 5,
    min: 0,
    max: 10
  },
  last_restocked: {
    type: Date
  },
  created_by: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'raw_materials'
});

// Virtual field for available_stock
rawMaterialSchema.virtual('available_stock').get(function() {
  const reserved = this.reserved_stock || 0;
  const inProduction = this.in_production || 0;
  const currentStock = this.current_stock || 0;
  return Math.max(0, currentStock - reserved - inProduction);
});

// Ensure virtuals are included in JSON output
rawMaterialSchema.set('toJSON', { virtuals: true });
rawMaterialSchema.set('toObject', { virtuals: true });

// Index for better query performance
rawMaterialSchema.index({ name: 1, supplier_name: 1 });
rawMaterialSchema.index({ status: 1 });
rawMaterialSchema.index({ category: 1 });
rawMaterialSchema.index({ created_at: -1 }); // For sorting by newest first (matches Product model)

// Pre-save middleware to calculate total_value
rawMaterialSchema.pre('save', function(next) {
  this.total_value = this.current_stock * this.cost_per_unit;
  next();
});

const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);

export default RawMaterial;
