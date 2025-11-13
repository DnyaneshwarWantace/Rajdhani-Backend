import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Clear ALL data from MongoDB
const clearAllData = async () => {
  try {
    console.log('🔄 Starting complete database cleanup...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('');

    console.log('⚠️  WARNING: This will DELETE ALL DATA from ALL collections!');
    console.log('');
    console.log('Collections that will be cleared:');
    console.log('   - users');
    console.log('   - permissions');
    console.log('   - products');
    console.log('   - individual_products');
    console.log('   - raw_materials');
    console.log('   - orders');
    console.log('   - order_items');
    console.log('   - customers');
    console.log('   - suppliers');
    console.log('   - production_batches');
    console.log('   - production_flows');
    console.log('   - production_flow_steps');
    console.log('   - material_consumption');
    console.log('   - waste_management');
    console.log('   - machines');
    console.log('   - recipes');
    console.log('   - notifications');
    console.log('   - audit_logs');
    console.log('');
    
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections\n`);
    
    let totalDeleted = 0;
    
    // Clear each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🗑️  Clearing ${collectionName}...`);
      
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`   ✅ Deleted ${result.deletedCount} documents`);
      totalDeleted += result.deletedCount;
    }
    
    console.log('');
    console.log('═'.repeat(60));
    console.log(`🗑️  Total documents deleted: ${totalDeleted}`);
    console.log('═'.repeat(60));
    console.log('');

    // Now create admin user
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
    console.log('🎉 DATABASE COMPLETELY CLEARED AND RESET!');
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
    console.log('   3. Start adding your data (products, materials, customers, etc.)');
    console.log('');
    console.log('✨ Fresh database ready to use!');
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
console.log('🗑️  RAJDHANI - COMPLETE DATABASE CLEANUP');
console.log('═'.repeat(60));
console.log('');

clearAllData();

