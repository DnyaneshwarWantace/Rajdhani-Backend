import mongoose from 'mongoose';

const IndividualRawMaterialSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  material_id: {
    type: String,
    required: true,
    index: true
  },
  material_name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'in_production', 'used', 'sold', 'damaged'],
    default: 'available',
    index: true
  },
  // Reference to what consumed this material
  production_batch_id: {
    type: String,
    index: true
  },
  order_id: {
    type: String,
    index: true
  },
  customer_id: {
    type: String,
    index: true
  },
  // Tracking information
  purchase_date: {
    type: Date
  },
  supplier_id: {
    type: String
  },
  supplier_name: {
    type: String
  },
  cost_per_unit: {
    type: Number,
    min: 0
  },
  total_cost: {
    type: Number,
    min: 0
  },
  // Status change tracking
  status_history: [{
    from_status: String,
    to_status: String,
    changed_at: Date,
    changed_by: String,
    reason: String
  }],
  notes: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at timestamp before saving
IndividualRawMaterialSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Create indexes for common queries
IndividualRawMaterialSchema.index({ material_id: 1, status: 1 });
IndividualRawMaterialSchema.index({ production_batch_id: 1 });
IndividualRawMaterialSchema.index({ order_id: 1 });
IndividualRawMaterialSchema.index({ status: 1, material_id: 1 });

const IndividualRawMaterial = mongoose.models.IndividualRawMaterial || mongoose.model('IndividualRawMaterial', IndividualRawMaterialSchema);

export default IndividualRawMaterial;
