import mongoose from 'mongoose';

/**
 * Product Model (Base Product)
 * Main product template - individual products are created from this
 */
const productSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  qr_code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
    // Validated against dropdown_options in controller
  },
  subcategory: {
    type: String,
    default: '',
    trim: true
    // Validated against dropdown_options in controller
  },

  // Dimensions - COMPULSORY for SQM calculation
  length: {
    type: String,
    required: [true, 'Length is required for SQM calculation'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Length cannot be empty'
    }
  },
  width: {
    type: String,
    required: [true, 'Width is required for SQM calculation'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Width cannot be empty'
    }
  },
  // Length and Width Units - COMPULSORY for SQM calculation
  length_unit: {
    type: String,
    required: [true, 'Length unit is required for SQM calculation'],
    trim: true
    // Validated against dropdown_options in controller
  },
  width_unit: {
    type: String,
    required: [true, 'Width unit is required for SQM calculation'],
    trim: true
    // Validated against dropdown_options in controller
  },
  weight: {
    type: String,
    default: '',
    trim: true
  },
  weight_unit: {
    type: String,
    default: '',
    trim: true
    // Validated against dropdown_options in controller
  },

  // Product specifications
  color: {
    type: String,
    default: '',
    trim: true
    // Validated against dropdown_options in controller
  },
  pattern: {
    type: String,
    default: '',
    trim: true
    // Validated against dropdown_options in controller
  },
  unit: {
    type: String,
    required: true,
    trim: true
    // Validated against dropdown_options in controller
    // This is the measuring unit (e.g., "sqm" for carpets)
  },
  count_unit: {
    type: String,
    default: 'rolls',
    trim: true
    // This is the counting unit for whole products (e.g., "rolls" for carpets)
    // While unit is "sqm" for measuring, count_unit is "rolls" for inventory counting
  },

  // Stock tracking
  current_stock: {
    type: Number,
    default: 0,
    min: 0
  },
  base_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  min_stock_level: {
    type: Number,
    default: 10,
    min: 0
  },
  max_stock_level: {
    type: Number,
    default: 1000,
    min: 0
  },
  reorder_point: {
    type: Number,
    default: 10,
    min: 0
  },

  // Individual product tracking
  individual_stock_tracking: {
    type: Boolean,
    default: false
  },
  individual_products_count: {
    type: Number,
    default: 0,
    min: 0
  },

  // Notes and additional info
  notes: {
    type: String,
    trim: true
  },
  manufacturing_date: {
    type: Date
  },

  // Recipe
  has_recipe: {
    type: Boolean,
    default: false
  },

  // Image
  image_url: {
    type: String,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'active', 'inactive', 'discontinued'],
    default: 'in-stock'
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'products'
});

// Virtual for SQM calculation
productSchema.virtual('sqm').get(function() {
  if (!this.length || !this.width || !this.length_unit || !this.width_unit) {
    return 0;
  }

  // Convert to meters for consistent calculation
  let lengthInMeters = parseFloat(this.length);
  let widthInMeters = parseFloat(this.width);

  // Convert length to meters
  switch (this.length_unit) {
    case 'feet':
      lengthInMeters *= 0.3048; // 1 foot = 0.3048 meters
      break;
    // 'm' is already in meters
  }

  // Convert width to meters
  switch (this.width_unit) {
    case 'feet':
      widthInMeters *= 0.3048; // 1 foot = 0.3048 meters
      break;
    // 'm' is already in meters
  }

  return parseFloat((lengthInMeters * widthInMeters).toFixed(4));
});

// Virtual for dimensions display
productSchema.virtual('dimensions_display').get(function() {
  return `${this.length} ${this.length_unit} × ${this.width} ${this.width_unit}`;
});

// Ensure virtuals are included in JSON output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Indexes
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
