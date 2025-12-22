import mongoose from 'mongoose';

const materialConsumptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  production_batch_id: {
    type: String,
    required: true,
    index: true
  },
  production_product_id: {
    type: String,
    required: false,
    index: true
  },
  production_flow_id: {
    type: String,
    required: false,
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
  material_type: {
    type: String,
    enum: ['product', 'raw_material'],
    required: true
  },
  quantity_used: {
    type: Number,
    required: true,
    min: 0
  },
  // For products: actual consumed quantity (fractional, e.g., 0.4)
  // quantity_used represents whole products (e.g., 1), actual_consumed_quantity represents actual usage (e.g., 0.4)
  actual_consumed_quantity: {
    type: Number,
    required: false,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  consumed_at: {
    type: Date,
    default: Date.now
  },
  operator: {
    type: String,
    required: false
  },
  machine_id: {
    type: String,
    required: false
  },
  machine_name: {
    type: String,
    required: false
  },
  step_id: {
    type: String,
    required: false
  },
  step_name: {
    type: String,
    required: false
  },
  individual_product_ids: [{
    type: String
  }],
  individual_products: [{
    id: String,
    qr_code: String,
    serial_number: String,
    product_name: String,
    status: String,
    length: String,
    width: String,
    weight: String,
    color: String,
    pattern: String
  }],
  waste_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  waste_type: {
    type: String,
    enum: ['scrap', 'defective', 'excess', 'normal'],
    default: 'normal'
  },
  notes: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'adjusted'],
    default: 'active'
  },
  // For raw materials: track consumption status
  // 'reserved': material reserved for an order (when order is accepted)
  // 'in_production': material is being used in production, not yet deducted from inventory
  // 'used': material has been used in production, deducted from inventory
  // 'sold': material sold/dispatched to customer (when order is dispatched)
  consumption_status: {
    type: String,
    enum: ['reserved', 'in_production', 'used', 'sold'],
    default: 'in_production'
  },
  // Order and customer tracking (for raw materials sold/reserved)
  order_id: {
    type: String,
    required: false,
    index: true
  },
  customer_id: {
    type: String,
    required: false
  },
  customer_name: {
    type: String,
    required: false
  },
  reserved_at: {
    type: Date
  },
  sold_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'material_consumption'
});

// Indexes for better query performance
materialConsumptionSchema.index({ production_batch_id: 1, material_type: 1 });
materialConsumptionSchema.index({ material_id: 1, consumed_at: -1 });
materialConsumptionSchema.index({ production_flow_id: 1, step_id: 1 });
materialConsumptionSchema.index({ consumed_at: -1 });

// Pre-save middleware to update updated_at
materialConsumptionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Static method to get consumption summary for a production batch
materialConsumptionSchema.statics.getBatchSummary = async function(productionBatchId) {
  const summary = await this.aggregate([
    { $match: { production_batch_id: productionBatchId, status: 'active' } },
    {
      $group: {
        _id: {
          material_type: '$material_type',
          material_id: '$material_id',
          material_name: '$material_name',
          unit: '$unit'
        },
        total_quantity: { $sum: '$quantity_used' },
        total_waste: { $sum: '$waste_quantity' },
        consumption_count: { $sum: 1 },
        last_consumed: { $max: '$consumed_at' }
      }
    },
    {
      $project: {
        material_type: '$_id.material_type',
        material_id: '$_id.material_id',
        material_name: '$_id.material_name',
        unit: '$_id.unit',
        total_quantity: 1,
        total_waste: 1,
        consumption_count: 1,
        last_consumed: 1,
        _id: 0
      }
    }
  ]);
  
  return summary;
};

// Static method to get consumption by material type
materialConsumptionSchema.statics.getConsumptionByType = async function(productionBatchId, materialType) {
  return await this.find({
    production_batch_id: productionBatchId,
    material_type: materialType,
    status: 'active'
  }).sort({ consumed_at: -1 });
};

// Static method to get consumption for a specific step
materialConsumptionSchema.statics.getStepConsumption = async function(stepId) {
  return await this.find({
    step_id: stepId,
    status: 'active'
  }).sort({ consumed_at: -1 });
};

// Instance method to calculate efficiency
materialConsumptionSchema.methods.calculateEfficiency = function() {
  if (this.quantity_used === 0) return 0;
  const wastePercentage = (this.waste_quantity / this.quantity_used) * 100;
  return Math.max(0, 100 - wastePercentage);
};

// Clear any cached model to ensure schema changes take effect
if (mongoose.models.MaterialConsumption) {
  delete mongoose.models.MaterialConsumption;
  delete mongoose.connection.models.MaterialConsumption;
}

export default mongoose.model('MaterialConsumption', materialConsumptionSchema);
