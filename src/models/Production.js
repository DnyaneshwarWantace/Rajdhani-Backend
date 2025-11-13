import mongoose from 'mongoose';

// Production Batches - matches Supabase production_batches table exactly
const ProductionBatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  batch_number: { type: String, required: true, unique: true },
  product_id: { type: String, required: true },
  order_id: { type: String },
  planned_quantity: { type: Number, required: true },
  actual_quantity: { type: Number, default: 0 },
  start_date: { type: Date, default: Date.now },
  completion_date: { type: Date },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'paused', 'cancelled'],
    default: 'planned'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  operator: { type: String },
  supervisor: { type: String },
  notes: { type: String }
}, {
  timestamps: true,
  collection: 'production_batches'
});

// Production Steps - matches Supabase production_steps table exactly
const ProductionStepSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  production_batch_id: { type: String, required: true },
  step_number: { type: Number, required: true },
  step_name: { type: String, required: true },
  description: { type: String },
  estimated_duration: { type: Number }, // in minutes
  actual_duration: { type: Number }, // in minutes
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  operator: { type: String },
  start_time: { type: Date },
  end_time: { type: Date },
  quality_check_result: { type: String },
  notes: { type: String }
}, {
  timestamps: true,
  collection: 'production_steps'
});

// Production Flows - matches Supabase production_flows table exactly
const ProductionFlowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  production_product_id: { type: String, required: true },
  flow_name: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  current_step: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'production_flows'
});

// Production Flow Steps - matches Supabase production_flow_steps table exactly
const ProductionFlowStepSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  flow_id: { type: String, required: true },
  step_name: { type: String, required: true },
  step_type: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped'],
    default: 'pending'
  },
  order_index: { type: Number, required: true },
  machine_id: { type: String },
  inspector_name: { type: String },
  start_time: { type: Date },
  end_time: { type: Date },
  notes: { type: String }
}, {
  timestamps: true,
  collection: 'production_flow_steps'
});

// Material Consumption - matches Supabase material_consumption table exactly
const MaterialConsumptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  production_product_id: { type: String, required: true },
  material_id: { type: String, required: true },
  material_name: { type: String, required: true },
  quantity_used: { type: Number, required: true },
  unit: { type: String, required: true },
  consumed_at: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'material_consumption'
});

// Indexes for efficient querying
ProductionBatchSchema.index({ batch_number: 1 }, { unique: true });
ProductionBatchSchema.index({ product_id: 1 });
ProductionBatchSchema.index({ order_id: 1 });
ProductionBatchSchema.index({ status: 1 });
ProductionBatchSchema.index({ created_at: -1 });

ProductionStepSchema.index({ production_batch_id: 1 });
ProductionStepSchema.index({ step_number: 1 });
ProductionStepSchema.index({ status: 1 });

ProductionFlowSchema.index({ production_product_id: 1 });
ProductionFlowSchema.index({ status: 1 });

ProductionFlowStepSchema.index({ flow_id: 1 });
ProductionFlowStepSchema.index({ order_index: 1 });

MaterialConsumptionSchema.index({ production_product_id: 1 });
MaterialConsumptionSchema.index({ material_id: 1 });

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);
const ProductionStep = mongoose.model('ProductionStep', ProductionStepSchema);
const ProductionFlow = mongoose.model('ProductionFlow', ProductionFlowSchema);
const ProductionFlowStep = mongoose.model('ProductionFlowStep', ProductionFlowStepSchema);
const MaterialConsumption = mongoose.model('MaterialConsumption', MaterialConsumptionSchema);

export { ProductionBatch, ProductionStep, ProductionFlow, ProductionFlowStep, MaterialConsumption };
export default ProductionBatch;
