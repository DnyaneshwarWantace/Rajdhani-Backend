import mongoose from 'mongoose';

/**
 * Order Model
 * Manages customer orders with items, pricing, and workflow tracking
 */
const orderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  order_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customer_id: {
    type: String,
    ref: 'Customer',
    index: true
  },
  customer_name: {
    type: String,
    required: true,
    trim: true
  },
  customer_email: {
    type: String,
    trim: true,
    lowercase: true
  },
  customer_phone: {
    type: String,
    trim: true
  },
  
  // Order dates
  order_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  expected_delivery: {
    type: Date
  },
  
  // Pricing (stored as strings to match Supabase)
  subtotal: {
    type: String,
    required: true,
    default: "0.00"
  },
  gst_rate: {
    type: String,
    default: "18.00"
  },
  gst_amount: {
    type: String,
    default: "0.00"
  },
  gst_included: {
    type: Boolean,
    default: true
  },
  discount_amount: {
    type: String,
    default: "0.00"
  },
  total_amount: {
    type: String,
    required: true,
    default: "0.00"
  },
  paid_amount: {
    type: String,
    default: "0.00"
  },
  outstanding_amount: {
    type: String,
    default: "0.00"
  },
  
  // Payment management
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'bank-transfer', 'credit', 'cheque', 'upi'],
    default: 'credit'
  },
  payment_terms: {
    type: String,
    default: '30 days',
    trim: true
  },
  due_date: {
    type: Date
  },
  
  // Order status and workflow
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  workflow_step: {
    type: String,
    enum: ['accept', 'dispatch', 'delivered'],
    default: 'accept'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Workflow timestamps
  accepted_at: {
    type: Date
  },
  dispatched_at: {
    type: Date
  },
  delivered_at: {
    type: Date
  },
  
  // Delivery information (stored as JSON string to match Supabase)
  delivery_address: {
    type: String,
    trim: true
  },
  
  // Additional information
  special_instructions: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  created_by: {
    type: String,
    required: true,
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
  collection: 'orders'
});

// Indexes
orderSchema.index({ customer_id: 1 });
orderSchema.index({ order_date: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ priority: 1 });
orderSchema.index({ created_by: 1 });

// Virtual for order age (days since creation)
orderSchema.virtual('order_age_days').get(function() {
  return Math.floor((Date.now() - this.order_date) / (1000 * 60 * 60 * 24));
});

// Virtual for delivery status
orderSchema.virtual('is_delivered').get(function() {
  return this.status === 'delivered';
});

// Virtual for payment status
orderSchema.virtual('payment_status').get(function() {
  if (this.outstanding_amount <= 0) return 'paid';
  if (this.paid_amount > 0) return 'partial';
  return 'unpaid';
});

// Ensure virtuals are included in JSON output
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate amounts
orderSchema.pre('save', function(next) {
  // Parse string values to numbers for calculations
  const subtotal = parseFloat(this.subtotal) || 0;
  const gstRate = parseFloat(this.gst_rate) || 0;
  const discountAmount = parseFloat(this.discount_amount) || 0;
  const paidAmount = parseFloat(this.paid_amount) || 0;
  
  // Calculate GST amount based on whether GST is included
  let gstAmount = 0;
  if (this.gst_included) {
    gstAmount = (subtotal * gstRate) / 100;
  }
  
  // Calculate total amount
  const totalAmount = subtotal + gstAmount - discountAmount;
  
  // Calculate outstanding amount
  const outstandingAmount = totalAmount - paidAmount;
  
  // Update string fields with calculated values
  this.gst_amount = gstAmount.toFixed(2);
  this.total_amount = totalAmount.toFixed(2);
  this.outstanding_amount = outstandingAmount.toFixed(2);
  
  // Set payment method based on paid amount
  if (paidAmount >= totalAmount) {
    this.payment_method = 'cash';
    this.payment_terms = 'Paid in full';
    this.due_date = undefined;
  } else if (paidAmount > 0) {
    this.payment_method = 'credit';
    this.payment_terms = 'Partial payment';
  } else {
    this.payment_method = 'credit';
    this.payment_terms = '30 days';
    this.due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Update timestamp
  this.updated_at = new Date();
  
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
