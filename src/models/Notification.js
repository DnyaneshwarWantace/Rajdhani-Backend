import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'error', 'success', 'production_request', 'restock_request', 'low_stock', 'order_alert'],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['unread', 'read', 'dismissed'],
    default: 'unread',
    index: true
  },
  module: {
    type: String,
    required: true,
    enum: ['orders', 'products', 'materials', 'production'],
    index: true
  },
  related_id: {
    type: String,
    index: true
  },
  related_data: {
    type: mongoose.Schema.Types.Mixed
  },
  created_by: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Create indexes for better performance
notificationSchema.index({ module: 1, status: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ created_at: -1 });

export default mongoose.model('Notification', notificationSchema);
