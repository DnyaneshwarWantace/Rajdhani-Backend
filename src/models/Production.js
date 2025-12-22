import mongoose from 'mongoose';
import MaterialConsumption from './MaterialConsumption.js';

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
  notes: { type: String },

  // Stage tracking
  planning_stage: {
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
    started_by: { type: String },
    started_at: { type: Date },
    completed_by: { type: String },
    completed_at: { type: Date },
    materials_draft: { type: Array, default: [] },
    materials_consumed: { type: Array, default: [] }
  },
  machine_stage: {
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    started_by: { type: String },
    started_at: { type: Date },
    completed_by: { type: String },
    completed_at: { type: Date }
  },
  wastage_stage: {
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    started_by: { type: String },
    started_at: { type: Date },
    completed_by: { type: String },
    completed_at: { type: Date },
    has_wastage: { type: Boolean, default: false }
  },
  final_stage: {
    status: { type: String, enum: ['not_started', 'completed'], default: 'not_started' },
    started_by: { type: String },
    started_at: { type: Date },
    completed_by: { type: String },
    completed_at: { type: Date },
    products_count: { type: Number, default: 0 }
  }
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

// Production Flows - tracks workflow for a production batch
const ProductionFlowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  production_batch_id: { type: String, required: true, index: true }, // Primary: batch ID (clearer naming)
  production_product_id: { type: String, required: false, index: true }, // Optional: for backward compatibility (same as batch_id)
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
  shift: { type: String, enum: ['day', 'night'], default: 'day' },
   start_time: { type: Date },
  end_time: { type: Date },
  notes: { type: String }
}, {
  timestamps: true,
  collection: 'production_flow_steps'
});

// Material Consumption - Imported from MaterialConsumption.js to avoid duplicate model compilation

// Indexes for efficient querying
ProductionBatchSchema.index({ batch_number: 1 }, { unique: true });
ProductionBatchSchema.index({ product_id: 1 });
ProductionBatchSchema.index({ order_id: 1 });
ProductionBatchSchema.index({ status: 1 });
ProductionBatchSchema.index({ created_at: -1 });

ProductionStepSchema.index({ production_batch_id: 1 });
ProductionStepSchema.index({ step_number: 1 });
ProductionStepSchema.index({ status: 1 });

ProductionFlowSchema.index({ production_batch_id: 1 });
ProductionFlowSchema.index({ production_product_id: 1 }); // Keep for backward compatibility
ProductionFlowSchema.index({ status: 1 });

ProductionFlowStepSchema.index({ flow_id: 1 });
ProductionFlowStepSchema.index({ order_index: 1 });


const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);
const ProductionStep = mongoose.model('ProductionStep', ProductionStepSchema);
const ProductionFlow = mongoose.model('ProductionFlow', ProductionFlowSchema);
const ProductionFlowStep = mongoose.model('ProductionFlowStep', ProductionFlowStepSchema);
// MaterialConsumption is imported from MaterialConsumption.js

export { ProductionBatch, ProductionStep, ProductionFlow, ProductionFlowStep, MaterialConsumption };
export default ProductionBatch;
