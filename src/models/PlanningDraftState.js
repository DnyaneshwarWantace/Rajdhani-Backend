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

