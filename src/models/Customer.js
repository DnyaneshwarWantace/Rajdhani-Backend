import mongoose from 'mongoose';

/**
 * Customer Model
 * Manages customer information with address tracking and order history
 */
const customerSchema = new mongoose.Schema({
  id: {
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
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Basic address fields (for backward compatibility)
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  
  // Customer type and status
  customer_type: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'new'],
    default: 'new'
  },
  
  // Business information (for business customers)
  company_name: {
    type: String,
    trim: true
  },
  gst_number: {
    type: String,
    trim: true
  },
  
  // Address information (stored as JSON strings to match Supabase)
  permanent_address: {
    type: String,
    trim: true
  },
  delivery_address: {
    type: String,
    trim: true
  },
  
  // Financial information (stored as strings to match Supabase)
  credit_limit: {
    type: String,
    default: "0.00"
  },
  outstanding_amount: {
    type: String,
    default: "0.00"
  },
  
  // Order tracking
  total_orders: {
    type: Number,
    default: 0,
    min: 0
  },
  total_value: {
    type: String,
    default: "0.00"
  },
  last_order_date: {
    type: Date
  },
  registration_date: {
    type: Date,
    default: Date.now
  },
  
  // Additional information
  notes: {
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
  collection: 'customers'
});

// Indexes
customerSchema.index({ name: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ customer_type: 1 });

// Virtual for full name (for business customers)
customerSchema.virtual('display_name').get(function() {
  return this.customer_type === 'business' && this.company_name 
    ? `${this.company_name} (${this.name})`
    : this.name;
});

// Virtual for address display
customerSchema.virtual('permanent_address_display').get(function() {
  if (!this.permanent_address || !this.permanent_address.address) return '';
  const addr = this.permanent_address;
  return `${addr.address}, ${addr.city}, ${addr.state} - ${addr.pincode}`;
});

customerSchema.virtual('delivery_address_display').get(function() {
  if (!this.delivery_address || !this.delivery_address.address) return '';
  const addr = this.delivery_address;
  return `${addr.address}, ${addr.city}, ${addr.state} - ${addr.pincode}`;
});

// Virtual for customer since (days)
customerSchema.virtual('customer_since_days').get(function() {
  return Math.floor((Date.now() - this.registration_date) / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update timestamps
customerSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
