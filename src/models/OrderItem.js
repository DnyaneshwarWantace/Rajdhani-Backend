import mongoose from 'mongoose';

/**
 * Order Item Model
 * Manages individual items within orders
 */
const orderItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  order_id: {
    type: String,
    required: true,
    ref: 'Order',
    index: true
  },
  product_id: {
    type: String,
    ref: 'Product',
    index: true
  },
  individual_product_id: {
    type: String,
    ref: 'IndividualProduct',
    index: true
  },
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  product_type: {
    type: String,
    enum: ['product', 'raw_material'],
    default: 'product'
  },
  
  // Quantity and pricing
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: String,
    required: true
  },
  total_price: {
    type: String,
    required: true
  },

  // Additional pricing fields for SQM-based calculations
  pricing_unit: {
    type: String,
    enum: ['piece', 'sqm', 'meter', 'kg', null],
    default: null
  },
  unit_value: {
    type: Number, // The calculated unit value (e.g., SQM per piece)
    default: null
  },
  product_dimensions: {
    type: mongoose.Schema.Types.Mixed, // Store product dimensions for reference
    default: null
  },

  quality_grade: {
    type: String,
    trim: true
  },

  specifications: {
    type: String,
    trim: true
  },
  
  // Individual product tracking (matches frontend structure)
  selected_individual_products: [{
    individual_product_id: {
      type: String,
      ref: 'IndividualProduct'
    },
    qr_code: {
      type: String,
      trim: true
    },
    serial_number: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['allocated', 'reserved', 'sold', 'shipped'],
      default: 'allocated'
    },
    allocated_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Stock tracking
  available_stock: {
    type: Number,
    default: 0
  },
  individual_stock_tracking: {
    type: Boolean,
    default: true
  },
  
  // Raw material tracking (if applicable)
  raw_material_id: {
    type: String,
    ref: 'RawMaterial'
  },
  supplier_id: {
    type: String,
    ref: 'Supplier'
  },
  
  // Production tracking
  production_status: {
    type: String,
    enum: ['pending', 'in_production', 'completed', 'shipped'],
    default: 'pending'
  },
  production_notes: {
    type: String,
    trim: true
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
  collection: 'order_items'
});

// Indexes
orderItemSchema.index({ order_id: 1 });
orderItemSchema.index({ product_id: 1 });
orderItemSchema.index({ production_status: 1 });

// Virtual for item value per unit
orderItemSchema.virtual('value_per_unit').get(function() {
  return this.total_price / this.quantity;
});

// Virtual for production progress
orderItemSchema.virtual('production_progress').get(function() {
  const statusMap = {
    'pending': 0,
    'in_production': 50,
    'completed': 100,
    'shipped': 100
  };
  return statusMap[this.production_status] || 0;
});

// Virtual for selected individual products count
orderItemSchema.virtual('selected_count').get(function() {
  return this.selected_individual_products ? this.selected_individual_products.length : 0;
});

// Virtual for individual product selection status
orderItemSchema.virtual('is_fully_selected').get(function() {
  return this.selected_count >= this.quantity;
});

// Ensure virtuals are included in JSON output
orderItemSchema.set('toJSON', { virtuals: true });
orderItemSchema.set('toObject', { virtuals: true });

// Pre-save middleware - DO NOT recalculate if total_price is already set
orderItemSchema.pre('save', function(next) {
  console.log('PRE-SAVE HOOK - Before:', {
    product: this.product_name,
    quantity: this.quantity,
    unit_price: this.unit_price,
    total_price_before: this.total_price,
    pricing_unit: this.pricing_unit,
    unit_value: this.unit_value
  });

  // IMPORTANT: Only auto-calculate if total_price is missing, empty, or zero
  // If frontend sends a total_price, we MUST use it (for SQM-based pricing)
  const totalPriceValue = parseFloat(this.total_price);
  const shouldCalculate = !this.total_price ||
                          this.total_price === '' ||
                          this.total_price === '0' ||
                          isNaN(totalPriceValue) ||
                          totalPriceValue === 0;

  console.log('Should calculate?', shouldCalculate, 'totalPriceValue:', totalPriceValue);

  if (shouldCalculate) {
    const unitPrice = parseFloat(this.unit_price) || 0;
    this.total_price = (this.quantity * unitPrice).toFixed(2);
    console.log('CALCULATED total_price:', this.total_price);
  } else {
    console.log('KEEPING total_price:', this.total_price);
  }

  this.updated_at = new Date();
  next();
});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);

export default OrderItem;
