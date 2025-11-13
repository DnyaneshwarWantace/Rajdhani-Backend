import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Reset database and create admin user
const resetAndCreateAdmin = async () => {
  try {
    console.log('🔄 Starting database reset and admin creation...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('');

    // Ask for confirmation
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the following collections:');
    console.log('   - users');
    console.log('   - permissions');
    console.log('');
    console.log('💡 TIP: Your other data (products, orders, materials, etc.) will NOT be affected');
    console.log('');
    
    // Clear users collection
    console.log('🗑️  Clearing users collection...');
    const deletedUsers = await User.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUsers.deletedCount} users`);

    // Clear permissions collection
    console.log('🗑️  Clearing permissions collection...');
    const deletedPermissions = await Permission.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPermissions.deletedCount} permission records`);
    console.log('');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = new User({
      id: 'USER-ADMIN-001',
      email: 'admin@rajdhani.com',
      password: 'admin123', // Will be hashed by pre-save hook
      full_name: 'System Administrator',
      role: 'admin',
      status: 'active',
      phone: '',
      department: 'Administration',
      created_by: 'system'
    });

    await adminUser.save();
    console.log('   ✅ Admin user created successfully');
    console.log('');

    // Create admin permissions
    console.log('🔐 Creating admin permissions...');
    const adminPermissions = new Permission({
      id: 'PERM-ADMIN-001',
      role: 'admin',
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
        users: true
      },
      action_permissions: {
        product_view: true, product_create: true, product_edit: true, product_delete: true,
        production_view: true, production_create: true, production_start: true, production_complete: true,
        material_view: true, material_create: true, material_edit: true, material_delete: true, material_restock: true,
        order_view: true, order_create: true, order_edit: true, order_delete: true, order_approve: true, order_deliver: true,
        report_view: true, report_export: true,
        user_view: true, user_create: true, user_edit: true, user_delete: true
      }
    });

    await adminPermissions.save();
    console.log('   ✅ Admin permissions created successfully');
    console.log('');

    // Create default permissions for other roles
    console.log('🔐 Creating default permissions for other roles...');
    
    const defaultRoles = [
      {
        role: 'manager',
        pages: { dashboard: true, products: true, production: true, materials: true, orders: true, customers: true, suppliers: true, machines: true, reports: true, settings: false, users: false },
        actions: { product_view: true, product_create: true, product_edit: true, product_delete: false, production_view: true, production_create: true, production_start: true, production_complete: true, material_view: true, material_create: true, material_edit: true, material_delete: false, material_restock: true, order_view: true, order_create: true, order_edit: true, order_delete: false, order_approve: true, order_deliver: true, report_view: true, report_export: true, user_view: false, user_create: false, user_edit: false, user_delete: false }
      },
      {
        role: 'production_manager',
        pages: { dashboard: true, products: true, production: true, materials: true, orders: false, customers: false, suppliers: false, machines: true, reports: true, settings: false, users: false },
        actions: { product_view: true, product_create: false, product_edit: false, product_delete: false, production_view: true, production_create: true, production_start: true, production_complete: true, material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false, order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false, report_view: true, report_export: false, user_view: false, user_create: false, user_edit: false, user_delete: false }
      },
      {
        role: 'operator',
        pages: { dashboard: true, products: true, production: true, materials: true, orders: false, customers: false, suppliers: false, machines: true, reports: false, settings: false, users: false },
        actions: { product_view: true, product_create: false, product_edit: false, product_delete: false, production_view: true, production_create: false, production_start: true, production_complete: false, material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false, order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false, report_view: false, report_export: false, user_view: false, user_create: false, user_edit: false, user_delete: false }
      },
      {
        role: 'viewer',
        pages: { dashboard: true, products: true, production: true, materials: true, orders: true, customers: true, suppliers: true, machines: true, reports: true, settings: false, users: false },
        actions: { product_view: true, product_create: false, product_edit: false, product_delete: false, production_view: true, production_create: false, production_start: false, production_complete: false, material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false, order_view: true, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false, report_view: true, report_export: false, user_view: false, user_create: false, user_edit: false, user_delete: false }
      }
    ];

    for (const roleConfig of defaultRoles) {
      const permission = new Permission({
        id: `PERM-${roleConfig.role.toUpperCase()}-001`,
        role: roleConfig.role,
        page_permissions: roleConfig.pages,
        action_permissions: roleConfig.actions
      });
      await permission.save();
      console.log(`   ✅ Created permissions for role: ${roleConfig.role}`);
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('🎉 DATABASE RESET AND SETUP COMPLETE!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📧 Admin Email: admin@rajdhani.com');
    console.log('🔑 Admin Password: admin123');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after login!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Go to http://localhost:5173/login');
    console.log('   2. Login with admin credentials');
    console.log('   3. Go to Settings → Security → Change password');
    console.log('   4. Go to Settings → Users → Create your team members');
    console.log('   5. Go to Settings → Permissions → Configure role permissions');
    console.log('');
    console.log('✅ Your other data (products, orders, materials) is safe!');
    console.log('');
    console.log('═'.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('💡 MongoDB connection failed. Please check:');
      console.error('   1. MongoDB is running');
      console.error('   2. MONGODB_URI in .env is correct');
      console.error('   3. Network connection is working');
      console.error('');
      console.error('Current MONGODB_URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    }
    process.exit(1);
  }
};

// Run the script
console.log('');
console.log('═'.repeat(60));
console.log('🔄 RAJDHANI - DATABASE RESET & ADMIN CREATION');
console.log('═'.repeat(60));
console.log('');

resetAndCreateAdmin();

