import mongoose from 'mongoose';

const ProductionWasteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  waste_number: { type: String, required: true, unique: true },
  production_id: { type: String, required: true },
  batch_id: { type: String },
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  waste_type: {
    type: String,
    enum: ['cutting_waste', 'defective_products', 'excess_material', 'contamination', 'expired_material', 'other'],
    required: true
  },
  waste_category: {
    type: String,
    enum: ['recyclable', 'reusable', 'disposable', 'hazardous', 'organic'],
    required: true
  },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  weight: { type: Number },
  weight_unit: { type: String, default: 'kg' },
  waste_percentage: { type: Number, required: true },
  generation_date: { type: Date, required: true },
  generation_stage: {
    type: String,
    enum: ['raw_material', 'cutting', 'weaving', 'finishing', 'packaging', 'quality_check'],
    required: true
  },
  reason: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['generated', 'collected', 'processed', 'disposed', 'recycled', 'reused'],
    default: 'generated'
  },
  disposal_method: {
    type: String,
    enum: ['recycle', 'reuse', 'dispose', 'sell', 'donate', 'return_to_supplier'],
    default: 'dispose'
  },
  disposal_date: { type: Date },
  disposal_cost: { type: Number, default: 0 },
  recovery_value: { type: Number, default: 0 },
  environmental_impact: {
    co2_emissions: { type: Number, default: 0 },
    water_usage: { type: Number, default: 0 },
    energy_usage: { type: Number, default: 0 }
  },
  quality_grade: {
    type: String,
    enum: ['A+', 'A', 'B', 'C', 'D'],
    default: 'C'
  },
  reusability_potential: {
    type: String,
    enum: ['high', 'medium', 'low', 'none'],
    default: 'low'
  },
  storage_location: { type: String },
  storage_conditions: { type: String },
  handling_instructions: { type: String },
  safety_requirements: { type: String },
  responsible_person: { type: String },
  supervisor: { type: String },
  photos: [{ type: String }], // URLs to waste photos
  documents: [{ type: String }], // URLs to waste documents
  tags: [{ type: String }],
  notes: { type: String },
  // Additional fields for waste recovery
  material_id: { type: String },
  material_name: { type: String },
  material_type: { type: String, enum: ['raw_material', 'product'], default: 'raw_material' }, // Track if it's a raw material or product
  can_be_reused: { type: Boolean, default: false },
  added_at: { type: Date }, // Timestamp when waste was returned to inventory
  created_by: { type: String, default: 'system' },
  updated_by: { type: String, default: 'system' }
}, {
  timestamps: true,
  collection: 'production_waste'
});

// Indexes for efficient querying
ProductionWasteSchema.index({ waste_number: 1 });
ProductionWasteSchema.index({ production_id: 1 });
ProductionWasteSchema.index({ batch_id: 1 });
ProductionWasteSchema.index({ product_id: 1 });
ProductionWasteSchema.index({ waste_type: 1 });
ProductionWasteSchema.index({ waste_category: 1 });
ProductionWasteSchema.index({ status: 1 });
ProductionWasteSchema.index({ generation_date: -1 });
ProductionWasteSchema.index({ generation_stage: 1 });

const ProductionWaste = mongoose.model('ProductionWaste', ProductionWasteSchema);
export default ProductionWaste;
