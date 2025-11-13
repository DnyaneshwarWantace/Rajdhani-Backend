import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';

dotenv.config();

// Helper function to create/update admin permissions
const fixAdminPermissions = async () => {
  try {
    await connectDB();
    console.log('📊 Database: Rajdhani');
    console.log('🔧 Fixing admin permissions...\n');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email}`);

    // Get or create admin permissions
    let adminPermissions = await Permission.findOne({ role: 'admin' });

    // Admin should have ALL permissions
    const correctPermissions = {
      page_permissions: {
        dashboard: true,
        products: true,
        production: true,
        materials: true,
        orders: true,
        customers: true,
        suppliers: true,
        machines: true,
        reports: true,
        settings: true,
        users: true,
        roles: true // ✅ Role management page
      },
      action_permissions: {
        // Products
        product_view: true,
        product_create: true,
        product_edit: true,
        product_delete: true, // ✅ Delete products
        
        // Production
        production_view: true,
        production_create: true,
        production_edit: true,
        production_delete: true, // ✅ Delete production
        production_start: true,
        production_complete: true,
        
        // Materials
        material_view: true,
        material_create: true,
        material_edit: true,
        material_delete: true,
        material_restock: true,
        
        // Orders
        order_view: true,
        order_create: true,
        order_edit: true,
        order_delete: true,
        order_approve: true,
        order_deliver: true,
        
        // Customers
        customer_view: true,
        customer_create: true,
        customer_edit: true,
        customer_delete: true, // ✅ Delete customers
        
        // Suppliers
        supplier_view: true,
        supplier_create: true,
        supplier_edit: true,
        supplier_delete: true, // ✅ Delete suppliers
        
        // Reports
        report_view: true,
        report_export: true,
        
        // Users
        user_view: true,
        user_create: true,
        user_edit: true,
        user_delete: true,
        
        // Roles
        role_view: true, // ✅ View roles
        role_create: true, // ✅ Create roles
        role_edit: true, // ✅ Edit roles
        role_delete: true, // ✅ Delete roles
        
        // Machines
        machine_view: true,
        machine_create: true,
        machine_edit: true,
        
        // Individual Products
        individual_product_view: true,
        individual_product_create: true,
        individual_product_edit: true,
        individual_product_delete: true
      }
    };

    if (!adminPermissions) {
      // Create new permissions
      adminPermissions = new Permission({
        id: `PERM-ADMIN-${Date.now()}`,
        role: 'admin',
        ...correctPermissions
      });
      await adminPermissions.save();
      console.log('✅ Created admin permissions');
    } else {
      // Update existing permissions
      adminPermissions.page_permissions = correctPermissions.page_permissions;
      adminPermissions.action_permissions = correctPermissions.action_permissions;
      await adminPermissions.save();
      console.log('✅ Updated admin permissions');
    }

    // Verify
    console.log('\n📋 Admin Permissions Summary:');
    console.log('   Page Permissions:');
    Object.entries(adminPermissions.page_permissions).forEach(([key, value]) => {
      console.log(`     ${key}: ${value ? '✅' : '❌'}`);
    });
    console.log('\n   Action Permissions (Delete):');
    Object.entries(adminPermissions.action_permissions)
      .filter(([key]) => key.includes('delete'))
      .forEach(([key, value]) => {
        console.log(`     ${key}: ${value ? '✅' : '❌'}`);
      });
    console.log('\n   Role Permissions:');
    ['role_view', 'role_create', 'role_edit', 'role_delete'].forEach(key => {
      const value = adminPermissions.action_permissions[key];
      console.log(`     ${key}: ${value ? '✅' : '❌'}`);
    });

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('✅ Admin permissions fixed successfully!');
    console.log('════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error fixing admin permissions:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

fixAdminPermissions();

