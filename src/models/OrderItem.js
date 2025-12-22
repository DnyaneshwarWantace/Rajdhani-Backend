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
  unit: {
    type: String, // Unit of measurement (kg, piece, roll, sqm, etc.)
    required: true,
    trim: true
  },
  unit_price: {
    type: String,
    required: true
  },

  // GST per item
  gst_rate: {
    type: String,
    default: "18.00" // Default 18% GST
  },
  gst_amount: {
    type: String,
    default: "0.00"
  },
  gst_included: {
    type: Boolean,
    default: true
  },

  // Pricing
  subtotal: {
    type: String, // quantity * unit_price
    required: true
  },
  total_price: {
    type: String, // subtotal + gst_amount
    required: true
  },

  // Additional pricing fields for SQM-based calculations
  pricing_unit: {
    type: String,
    enum: ['piece', 'sqm', 'meter', 'kg', 'roll', 'set', 'gsm', null],
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

// Pre-save middleware - Calculate subtotal, GST, and total
orderItemSchema.pre('save', function(next) {
  console.log('PRE-SAVE HOOK - Before:', {
    product: this.product_name,
    quantity: this.quantity,
    unit_price: this.unit_price,
    subtotal_before: this.subtotal,
    gst_rate: this.gst_rate,
    gst_amount_before: this.gst_amount,
    total_price_before: this.total_price,
    pricing_unit: this.pricing_unit,
    unit_value: this.unit_value
  });

  // Calculate subtotal (quantity * unit_price)
  const quantity = parseFloat(this.quantity) || 0;
  const unitPrice = parseFloat(this.unit_price) || 0;
  const subtotal = quantity * unitPrice;
  this.subtotal = subtotal.toFixed(2);

  // Calculate GST amount based on GST rate
  const gstRate = parseFloat(this.gst_rate) || 0;
  let gstAmount = 0;

  if (this.gst_included && gstRate > 0) {
    gstAmount = (subtotal * gstRate) / 100;
  }

  this.gst_amount = gstAmount.toFixed(2);

  // Calculate total price (subtotal + GST)
  const totalPrice = subtotal + gstAmount;
  this.total_price = totalPrice.toFixed(2);

  console.log('CALCULATED VALUES:', {
    subtotal: this.subtotal,
    gst_amount: this.gst_amount,
    total_price: this.total_price
  });

  this.updated_at = new Date();
  next();
});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);

export default OrderItem;
