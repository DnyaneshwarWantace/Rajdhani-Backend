import mongoose from 'mongoose';

const PlanningDraftStateSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  product_id: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  form_data: {
    planned_quantity: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    completion_date: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  // Materials currently in the "requirements" section
  materials: [
    {
      material_id: String,
      material_name: String,
      material_type: { type: String, enum: ['raw_material', 'product'] },
      quantity_per_sqm: Number,
      unit: String,
      required_quantity: Number,
      available_quantity: Number,
      status: { type: String, enum: ['available', 'low', 'unavailable'] },
      shortage: Number,
      cost_per_unit: Number,
      specifications: String,
      quality_requirements: String,
      is_optional: Boolean,
      waste_factor: Number
    }
  ],
  // Materials that have been added to production (bottom section in planning UI)
  consumed_materials: [
    {
      material_id: String,
      material_name: String,
      material_type: { type: String, enum: ['raw_material', 'product'] },
      quantity_per_sqm: Number,
      unit: String,
      required_quantity: Number, // Total quantity needed (e.g., 0.8 for 0.4 * 2 sqm)
      actual_consumed_quantity: Number, // For products: actual fractional consumption (e.g., 0.8)
      whole_product_count: Number, // For products: whole products needed (e.g., 1 for 0.8)
      individual_product_ids: [String], // For products: selected individual product IDs
      available_quantity: Number,
      status: { type: String, enum: ['available', 'low', 'unavailable'] },
      shortage: Number,
      cost_per_unit: Number,
      specifications: String,
      quality_requirements: String,
      is_optional: Boolean,
      waste_factor: Number
    }
  ],
  recipe_data: {
    id: String,
    product_id: String,
    materials: [{
      id: String,
      material_id: String,
      material_name: String,
      material_type: { type: String, enum: ['raw_material', 'product'] },
      quantity_per_sqm: Number,
      unit: String,
      cost_per_unit: Number,
      specifications: String,
      quality_requirements: String,
      is_optional: Boolean,
      waste_factor: Number
    }]
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
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for faster lookups
PlanningDraftStateSchema.index({ product_id: 1, user_id: 1 });

const PlanningDraftState = mongoose.model('PlanningDraftState', PlanningDraftStateSchema);

export default PlanningDraftState;

