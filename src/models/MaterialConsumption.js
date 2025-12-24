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
  // Import IndividualProduct model
  const IndividualProduct = mongoose.model('IndividualProduct');

  // Get all MaterialConsumption records for this batch
  const consumptionRecords = await this.find({
    production_batch_id: productionBatchId,
    status: 'active'
  }).lean();

  // Group by material and fetch real-time individual product statuses
  const materialMap = new Map();

  for (const record of consumptionRecords) {
    const key = `${record.material_id}`;

    if (!materialMap.has(key)) {
      materialMap.set(key, {
        material_type: record.material_type,
        material_id: record.material_id,
        material_name: record.material_name,
        unit: record.unit,
        quantity_per_sqm: record.quantity_per_sqm || 0,
        required_quantity: 0,
        actual_consumed_quantity: 0,
        whole_product_count: 0,
        total_waste: 0,
        consumption_count: 0,
        individual_product_ids: [],
        individual_products: [],
        last_consumed: record.consumed_at
      });
    }

    const material = materialMap.get(key);
    material.required_quantity += record.quantity_used || 0;
    material.actual_consumed_quantity += record.actual_consumed_quantity || record.quantity_used || 0;
    material.whole_product_count += record.quantity_used || 0;
    material.total_waste += record.waste_quantity || 0;
    material.consumption_count += 1;

    if (record.consumed_at > material.last_consumed) {
      material.last_consumed = record.consumed_at;
    }

    // Collect individual product IDs
    if (record.individual_product_ids && record.individual_product_ids.length > 0) {
      material.individual_product_ids.push(...record.individual_product_ids);
    }
  }

  // Fetch real-time status for individual products
  const summary = [];
  for (const material of materialMap.values()) {
    // For products with individual tracking, fetch current status
    if (material.material_type === 'product' && material.individual_product_ids.length > 0) {
      try {
        console.log(`🔍 Fetching real-time status for ${material.individual_product_ids.length} individual products of ${material.material_name}`);

        const individualProducts = await IndividualProduct.find({
          id: { $in: material.individual_product_ids }
        }).lean();

        console.log(`✅ Found ${individualProducts.length} individual products with statuses:`,
          individualProducts.map(p => ({ id: p.id, status: p.status }))
        );

        material.individual_products = individualProducts.map(p => ({
          id: p.id,
          qr_code: p.qr_code,
          serial_number: p.serial_number,
          product_name: p.product_name,
          status: p.status, // Real-time status
          length: p.final_length || '',
          width: p.final_width || '',
          weight: p.final_weight || '',
          color: p.color || '',
          pattern: p.pattern || ''
        }));
      } catch (error) {
        console.error(`Error fetching individual products for material ${material.material_id}:`, error);
      }
    }

    summary.push(material);
  }

  console.log(`📦 Returning ${summary.length} materials in summary`);
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
