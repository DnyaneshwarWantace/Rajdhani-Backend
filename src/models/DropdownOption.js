import mongoose from 'mongoose';

const dropdownOptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: [
      // Product dropdowns
      'weight', 'weight_units',
      'length', 'length_units', 'length_unit', // length_unit (singular) for backend validation
      'width', 'width_units', 'width_unit', // width_unit (singular) for backend validation
      'category', 'subcategory', 'color', 'pattern', 'unit',

      // Material dropdowns
      'material_category', 'material_unit', 'material_type', 'material_color',

      // Production dropdowns
      'priority', 'quality_rating', 'waste_type'
    ]
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  display_order: {
    type: Number,
    default: 999,
    min: 0
  },
  is_active: {
    type: Boolean,
    default: true
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
  timestamps: false, // We handle timestamps manually
  collection: 'dropdown_options'
});

// Pre-save middleware to update timestamps
dropdownOptionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  if (this.isNew) {
    this.created_at = new Date();
  }
  next();
});

// Indexes for better performance
dropdownOptionSchema.index({ category: 1, display_order: 1 });
dropdownOptionSchema.index({ category: 1, is_active: 1 });
dropdownOptionSchema.index({ category: 1, value: 1 }, { unique: true });

const DropdownOption = mongoose.model('DropdownOption', dropdownOptionSchema);

export default DropdownOption;
