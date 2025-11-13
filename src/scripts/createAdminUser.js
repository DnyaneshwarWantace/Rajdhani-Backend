import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Create admin user
const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@rajdhani.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('To reset password, use the reset-password endpoint');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      id: 'USER-ADMIN-001',
      email: 'admin@rajdhani.com',
      password: 'admin123', // Default password - CHANGE THIS IN PRODUCTION
      full_name: 'System Administrator',
      role: 'admin',
      status: 'active',
      phone: '',
      department: 'Administration',
      created_by: 'system'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('');
    console.log('='.repeat(50));
    console.log('📧 Email: admin@rajdhani.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  IMPORTANT: Change this password immediately!');
    console.log('='.repeat(50));
    console.log('');

    // Create admin permissions
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
    console.log('✅ Admin permissions created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();

