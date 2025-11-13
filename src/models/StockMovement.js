import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  material_id: {
    type: String,
    ref: 'RawMaterial',
    required: true
  },
  material_name: {
    type: String,
    required: true
  },
  movement_type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'transfer'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  previous_stock: {
    type: Number,
    required: true
  },
  new_stock: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['purchase', 'production', 'waste', 'adjustment', 'transfer', 'sale'],
    required: true
  },
  reference_id: String,
  reference_type: {
    type: String,
    enum: ['purchase_order', 'production', 'waste', 'adjustment', 'sale']
  },
  cost_per_unit: {
    type: Number,
    min: 0
  },
  total_cost: {
    type: Number,
    min: 0
  },
  operator: String,
  notes: String
}, {
  timestamps: true,
  collection: 'stock_movements'
});

// Virtual for created_at
stockMovementSchema.virtual('created_at').get(function() {
  return this.createdAt;
});

// Ensure virtuals are included in JSON output
stockMovementSchema.set('toJSON', { virtuals: true });
stockMovementSchema.set('toObject', { virtuals: true });

// Indexes for better query performance
stockMovementSchema.index({ material_id: 1 });
stockMovementSchema.index({ movement_type: 1 });
stockMovementSchema.index({ created_at: -1 });
stockMovementSchema.index({ reference_id: 1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

export default StockMovement;
