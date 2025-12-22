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
    required: true,
    trim: true
    // No enum - values come from dropdown options (category: 'waste_type')
    // Common values: 'Scrap', 'Defective', 'Excess' (and others added via dropdown management)
  },
  waste_category: {
    type: String,
    enum: ['reusable', 'disposable'],
    required: true
  },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  weight: { type: Number },
  weight_unit: { type: String, default: 'kg' },
  waste_percentage: { type: Number, required: true },
  generation_date: { type: Date, required: true },
  reason: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['generated', 'disposed', 'reused', 'added_to_inventory'],
    default: 'generated'
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
  individual_product_ids: [{ type: String }], // Individual product IDs that are marked as waste (for product type materials)
  individual_products: [{ type: mongoose.Schema.Types.Mixed }], // Full individual product details (for display)
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

const ProductionWaste = mongoose.model('ProductionWaste', ProductionWasteSchema);
export default ProductionWaste;
