import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Permission from '../models/Permission.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Helper function to create default permissions (same as in authController)
const createDefaultPermissions = (role) => {
  const permissionId = `PERM-${role.toUpperCase()}-${Date.now()}`;
  
  let defaultPermissions = {
    id: permissionId,
    role: role,
    page_permissions: {},
    action_permissions: {}
  };

  switch (role) {
    case 'inventory_manager':
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: false,
        materials: true,
        orders: false,
        customers: false,
        suppliers: true,
        machines: false,
        reports: true,
        settings: false,
        users: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: false,
        production_view: false, production_create: false, production_start: false, production_complete: false,
        material_view: true, material_create: true, material_edit: true, material_delete: false, material_restock: true,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false
      };
      break;

    case 'sales_manager':
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: false,
        materials: false,
        orders: true,
        customers: true,
        suppliers: false,
        machines: false,
        reports: true,
        settings: false,
        users: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: false, product_edit: false, product_delete: false,
        production_view: false, production_create: false, production_start: false, production_complete: false,
        material_view: false, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: true, order_create: true, order_edit: true, order_delete: false, order_approve: true, order_deliver: true,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false
      };
      break;

    default:
      return null;
  }

  return defaultPermissions;
};

// Update permissions for specific roles
const updateRolePermissions = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const rolesToUpdate = ['inventory_manager', 'sales_manager'];

    for (const role of rolesToUpdate) {
      console.log(`📝 Updating permissions for ${role}...`);
      
      // Find existing permission
      let permission = await Permission.findOne({ role });
      
      const newPermissions = createDefaultPermissions(role);
      
      if (!newPermissions) {
        console.log(`   ⚠️  No permissions defined for ${role}`);
        continue;
      }

      if (permission) {
        // Update existing permission
        permission.page_permissions = newPermissions.page_permissions;
        permission.action_permissions = newPermissions.action_permissions;
        await permission.save();
        console.log(`   ✅ Updated existing permissions for ${role}`);
      } else {
        // Create new permission
        permission = new Permission(newPermissions);
        await permission.save();
        console.log(`   ✅ Created new permissions for ${role}`);
      }

      console.log(`   📋 Page permissions:`, Object.keys(newPermissions.page_permissions).filter(k => newPermissions.page_permissions[k]).join(', '));
      console.log('');
    }

    console.log('═'.repeat(60));
    console.log('✅ Permissions updated successfully!');
    console.log('═'.repeat(60));
    console.log('\n💡 Users with these roles will get updated permissions on next login.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateRolePermissions();

