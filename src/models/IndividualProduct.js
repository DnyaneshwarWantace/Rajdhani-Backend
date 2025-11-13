import mongoose from 'mongoose';

/**
 * Individual Product Model
 * Tracks individual instances of products (when individual_stock_tracking is enabled)
 * Each individual product has its own QR code and tracking
 */
const individualProductSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  product_id: {
    type: String,
    required: true,
    ref: 'Product',
    index: true
  },
  qr_code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  serial_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Inherited from base product (for quick access)
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: ''
  },
  pattern: {
    type: String,
    default: ''
  },
  
  // Dimensions (inherited from base product - stored as strings with units)
  length: {
    type: String,
    required: true,
    trim: true
  },
  width: {
    type: String,
    required: true,
    trim: true
  },
  weight: {
    type: String,
    default: '',
    trim: true
  },
  
  // Individual product specific fields
  status: {
    type: String,
    enum: ['available', 'sold', 'damaged', 'returned', 'in_production', 'quality_check', 'reserved'],
    default: 'available'
  },
  
  // Production tracking
  production_date: {
    type: String,
    required: true,
    trim: true
  },
  completion_date: {
    type: String,
    trim: true
  },
  added_date: {
    type: String,
    required: true,
    trim: true
  },
  batch_number: {
    type: String,
    trim: true
  },
  quality_grade: {
    type: String,
    enum: ['A+', 'A', 'B', 'C'],
    default: 'A'
  },
  
  // Sale tracking
  sold_date: {
    type: Date
  },
  sold_to: {
    type: String,
    trim: true
  },
  customer_id: {
    type: String,
    trim: true
  },
  order_id: {
    type: String,
    trim: true
  },
  sale_price: {
    type: Number,
    min: 0
  },
  
  // Location tracking
  location: {
    type: String,
    default: 'Warehouse A - General Storage',
    trim: true
  },
  
  // Notes and history
  notes: {
    type: String,
    trim: true
  },
  production_notes: {
    type: String,
    trim: true
  },
  inspector: {
    type: String,
    trim: true
  },
  
  // Final measurements (actual measurements after production)
  final_weight: {
    type: String,
    trim: true
  },
  final_width: {
    type: String,
    trim: true
  },
  final_length: {
    type: String,
    trim: true
  },
  defects: [{
    type: {
      type: String,
      enum: ['minor', 'major', 'critical'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    reported_by: String,
    reported_date: {
      type: Date,
      default: Date.now
    },
    fixed: {
      type: Boolean,
      default: false
    },
    fixed_by: String,
    fixed_date: Date
  }],
  
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
  collection: 'individual_products'
});

// Indexes for better performance
individualProductSchema.index({ product_id: 1, status: 1 });
individualProductSchema.index({ qr_code: 1 });
individualProductSchema.index({ serial_number: 1 });
individualProductSchema.index({ status: 1 });
individualProductSchema.index({ current_location: 1 });

// Virtual for age (days since production)
individualProductSchema.virtual('age_days').get(function() {
  return Math.floor((Date.now() - this.production_date) / (1000 * 60 * 60 * 24));
});

// Virtual for is_available
individualProductSchema.virtual('is_available').get(function() {
  return this.status === 'available';
});

// Ensure virtuals are included in JSON output
individualProductSchema.set('toJSON', { virtuals: true });
individualProductSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update timestamps
individualProductSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const IndividualProduct = mongoose.model('IndividualProduct', individualProductSchema);

export default IndividualProduct;
