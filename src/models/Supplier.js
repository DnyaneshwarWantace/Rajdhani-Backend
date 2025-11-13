import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  contact_person: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
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
  gst_number: {
    type: String,
    trim: true
  },
  performance_rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 10
  },
  total_orders: {
    type: Number,
    default: 0,
    min: 0
  },
  total_value: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'suppliers'
});

// Virtual for created_at and updated_at
supplierSchema.virtual('created_at').get(function() {
  return this.createdAt;
});

supplierSchema.virtual('updated_at').get(function() {
  return this.updatedAt;
});

// Ensure virtuals are included in JSON output
supplierSchema.set('toJSON', { virtuals: true });
supplierSchema.set('toObject', { virtuals: true });

// Index for better query performance
supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
