import mongoose from 'mongoose';

const ProductionBatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  batch_number: { type: String, required: true, unique: true },
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  batch_size: { type: Number, required: true },
  unit: { type: String, required: true },
  status: {
    type: String,
    enum: ['planned', 'in_production', 'completed', 'cancelled', 'on_hold'],
    default: 'planned'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  planned_start_date: { type: Date },
  planned_end_date: { type: Date },
  actual_start_date: { type: Date },
  actual_end_date: { type: Date },
  assigned_machine: { type: String },
  assigned_operator: { type: String },
  supervisor: { type: String },
  recipe_id: { type: String },
  recipe_name: { type: String },
  materials_required: [{
    material_id: { type: String, required: true },
    material_name: { type: String, required: true },
    required_quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    available_quantity: { type: Number, default: 0 },
    allocated_quantity: { type: Number, default: 0 },
    cost_per_unit: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 }
  }],
  production_steps: [{
    step_number: { type: Number, required: true },
    step_name: { type: String, required: true },
    description: { type: String },
    estimated_duration: { type: Number, default: 0 }, // in minutes
    actual_duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending'
    },
    start_time: { type: Date },
    end_time: { type: Date },
    operator: { type: String },
    notes: { type: String }
  }],
  quality_specifications: [{
    parameter: { type: String, required: true },
    target_value: { type: String, required: true },
    acceptable_range: { type: String, required: true },
    unit: { type: String },
    checked: { type: Boolean, default: false },
    actual_value: { type: String },
    checked_by: { type: String },
    checked_at: { type: Date }
  }],
  waste_tracking: {
    expected_waste_percentage: { type: Number, default: 0 },
    actual_waste_percentage: { type: Number, default: 0 },
    waste_quantity: { type: Number, default: 0 },
    waste_type: { type: String },
    waste_disposal_method: { type: String },
    waste_cost: { type: Number, default: 0 }
  },
  cost_breakdown: {
    material_cost: { type: Number, default: 0 },
    labor_cost: { type: Number, default: 0 },
    machine_cost: { type: Number, default: 0 },
    overhead_cost: { type: Number, default: 0 },
    waste_cost: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    cost_per_unit: { type: Number, default: 0 }
  },
  notes: { type: String },
  created_by: { type: String, default: 'system' },
  updated_by: { type: String, default: 'system' }
}, {
  timestamps: true,
  collection: 'production_batches'
});

// Indexes for efficient querying
ProductionBatchSchema.index({ batch_number: 1 });
ProductionBatchSchema.index({ product_id: 1 });
ProductionBatchSchema.index({ status: 1 });
ProductionBatchSchema.index({ created_at: -1 });
ProductionBatchSchema.index({ assigned_machine: 1 });
ProductionBatchSchema.index({ assigned_operator: 1 });

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);
export default ProductionBatch;
