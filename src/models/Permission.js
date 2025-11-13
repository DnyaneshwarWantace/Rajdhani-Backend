import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    required: true,
    // No enum restriction - roles are now dynamic from database
  },
  page_permissions: {
    dashboard: { type: Boolean, default: true },
    products: { type: Boolean, default: true },
    production: { type: Boolean, default: true },
    materials: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    customers: { type: Boolean, default: true },
    suppliers: { type: Boolean, default: true },
    machines: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    settings: { type: Boolean, default: false },
    users: { type: Boolean, default: false },
    roles: { type: Boolean, default: false }
  },
  action_permissions: {
    // Products
    product_view: { type: Boolean, default: true },
    product_create: { type: Boolean, default: false },
    product_edit: { type: Boolean, default: false },
    product_delete: { type: Boolean, default: false },
    
    // Production
    production_view: { type: Boolean, default: true },
    production_create: { type: Boolean, default: false },
    production_edit: { type: Boolean, default: false },
    production_delete: { type: Boolean, default: false },
    production_start: { type: Boolean, default: false },
    production_complete: { type: Boolean, default: false },
    
    // Materials
    material_view: { type: Boolean, default: true },
    material_create: { type: Boolean, default: false },
    material_edit: { type: Boolean, default: false },
    material_delete: { type: Boolean, default: false },
    material_restock: { type: Boolean, default: false },
    
    // Orders
    order_view: { type: Boolean, default: true },
    order_create: { type: Boolean, default: false },
    order_edit: { type: Boolean, default: false },
    order_delete: { type: Boolean, default: false },
    order_approve: { type: Boolean, default: false },
    order_deliver: { type: Boolean, default: false },
    
    // Reports
    report_view: { type: Boolean, default: true },
    report_export: { type: Boolean, default: false },
    
    // Customers
    customer_view: { type: Boolean, default: true },
    customer_create: { type: Boolean, default: false },
    customer_edit: { type: Boolean, default: false },
    customer_delete: { type: Boolean, default: false },
    
    // Suppliers
    supplier_view: { type: Boolean, default: true },
    supplier_create: { type: Boolean, default: false },
    supplier_edit: { type: Boolean, default: false },
    supplier_delete: { type: Boolean, default: false },
    
    // Users
    user_view: { type: Boolean, default: false },
    user_create: { type: Boolean, default: false },
    user_edit: { type: Boolean, default: false },
    user_delete: { type: Boolean, default: false },
    
    // Roles
    role_view: { type: Boolean, default: false },
    role_create: { type: Boolean, default: false },
    role_edit: { type: Boolean, default: false },
    role_delete: { type: Boolean, default: false },
    
    // Machines (only view, create, edit - no delete endpoint exists)
    machine_view: { type: Boolean, default: true },
    machine_create: { type: Boolean, default: false },
    machine_edit: { type: Boolean, default: false },
    
    // Individual Products
    individual_product_view: { type: Boolean, default: true },
    individual_product_create: { type: Boolean, default: false },
    individual_product_edit: { type: Boolean, default: false },
    individual_product_delete: { type: Boolean, default: false }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Permission = mongoose.model('Permission', permissionSchema, 'permissions');

export default Permission;

