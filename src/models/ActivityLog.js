import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  user_name: {
    type: String,
    required: true
  },
  user_email: {
    type: String,
    required: true
  },
  user_role: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'PROFILE_UPDATE',

      // User Management
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_STATUS_CHANGE',

      // Order Management
      'ORDER_CREATE',
      'ORDER_UPDATE',
      'ORDER_DELETE',
      'ORDER_VIEW',
      'ORDER_STATUS_CHANGE',
      
      // Purchase Order Management
      'PURCHASE_ORDER_CREATE',
      'PURCHASE_ORDER_UPDATE',
      'PURCHASE_ORDER_DELETE',
      'PURCHASE_ORDER_STATUS_CHANGE',

      // Item Management
      'ITEM_CREATE',
      'ITEM_UPDATE',
      'ITEM_DELETE',
      'ITEM_VIEW',

      // Product Management
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      'PRODUCT_VIEW',

      // Material Management
      'MATERIAL_CREATE',
      'MATERIAL_UPDATE',
      'MATERIAL_DELETE',
      'MATERIAL_VIEW',

      // Recipe Management
      'RECIPE_CREATE',
      'RECIPE_UPDATE',
      'RECIPE_DELETE',
      'RECIPE_MATERIAL_ADD',
      'RECIPE_MATERIAL_REMOVE',

      // Client Management
      'CLIENT_CREATE',
      'CLIENT_UPDATE',
      'CLIENT_DELETE',
      'CLIENT_VIEW',

      // Settings
      'SETTINGS_VIEW',
      'SETTINGS_UPDATE',

      // Permissions & Roles
      'PERMISSION_UPDATE',
      'ROLE_CREATE',
      'ROLE_UPDATE',
      'ROLE_DELETE',

      // Logs
      'LOGS_VIEW',

      // File Operations
      'FILE_UPLOAD',
      'FILE_DELETE',

      // Reports
      'REPORT_GENERATE',
      'REPORT_EXPORT',

      // API Calls
      'API_CALL',

      // Other
      'OTHER'
    ]
  },
  action_category: {
    type: String,
    required: true,
    enum: ['AUTH', 'USER', 'ORDER', 'PURCHASE_ORDER', 'ITEM', 'PRODUCT', 'MATERIAL', 'RECIPE', 'CLIENT', 'SETTINGS', 'PERMISSION', 'FILE', 'REPORT', 'API', 'OTHER'],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  status_code: {
    type: Number
  },
  response_time: {
    type: Number // in milliseconds
  },
  target_resource: {
    type: String // ID or name of the resource being acted upon
  },
  target_resource_type: {
    type: String // e.g., 'Order', 'User', 'Product'
  },
  changes: {
    type: mongoose.Schema.Types.Mixed // Store before/after values for updates
  },
  error_message: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Additional context-specific data
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying
activityLogSchema.index({ created_at: -1 });
activityLogSchema.index({ user_id: 1, created_at: -1 });
activityLogSchema.index({ action_category: 1, created_at: -1 });
activityLogSchema.index({ action: 1, created_at: -1 });

// TTL index - automatically delete logs older than 90 days (optional)
// Uncomment if you want automatic cleanup
// activityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
