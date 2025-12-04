import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  order_number: {
    type: String,
    required: true,
    unique: true
  },
  supplier_id: {
    type: String,
    ref: 'Supplier'
  },
  supplier_name: {
    type: String,
    required: true,
    trim: true
  },
  order_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  expected_delivery: {
    type: Date
  },
  actual_delivery: {
    type: Date
  },
  total_amount: {
    type: Number,
    required: true,
    default: 0
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'shipped', 'delivered', 'cancelled'],
    default: 'draft'
  },
  items: [{
    material_id: {
      type: String,
      ref: 'RawMaterial',
      required: true
    },
    material_name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    total_price: {
      type: Number,
      required: true,
      min: 0
    },
    specifications: String,
    quality_requirements: String
  }],
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    tax_rate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100
    },
    tax_amount: {
      type: Number,
      default: 0
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    total_amount: {
      type: Number,
      required: true,
      default: 0
    },
    paid_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    outstanding_amount: {
      type: Number,
      default: 0
    }
  },
  delivery: {
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    },
    contact_person: String,
    phone: String,
    special_instructions: String
  },
  approval: {
    requested_by: String,
    approved_by: String,
    approved_at: Date,
    notes: String
  },
  notes: {
    type: String
  },
  created_by: {
    type: String,
    default: 'system'
  },
  material_details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status_history: [{
    status: {
      type: String,
      required: true
    },
    changed_by: {
      type: String,
      required: true
    },
    changed_at: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, {
  timestamps: true,
  collection: 'purchase_orders'
});

// Virtual for created_at and updated_at
purchaseOrderSchema.virtual('created_at').get(function() {
  return this.createdAt;
});

purchaseOrderSchema.virtual('updated_at').get(function() {
  return this.updatedAt;
});

// Ensure virtuals are included in JSON output
purchaseOrderSchema.set('toJSON', { virtuals: true });
purchaseOrderSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate totals
purchaseOrderSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.total_price = item.quantity * item.unit_price;
  });
  
  // Calculate pricing
  this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.total_price, 0);
  this.pricing.tax_amount = (this.pricing.subtotal * this.pricing.tax_rate) / 100;
  this.pricing.total_amount = this.pricing.subtotal + this.pricing.tax_amount - this.pricing.discount_amount;
  this.pricing.outstanding_amount = this.pricing.total_amount - this.pricing.paid_amount;
  
  next();
});

// Index for better query performance
purchaseOrderSchema.index({ supplier_id: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ order_date: -1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
