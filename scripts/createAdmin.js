import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Permission from '../src/models/Permission.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create admin user
const createAdmin = async () => {
  try {
    await connectDB();

    // Get admin email and password from command line or use defaults
    const email = process.argv[2] || 'admin@rajdhani.com';
    const password = process.argv[3] || 'Admin@123';
    const fullName = process.argv[4] || 'System Administrator';

    console.log('\n🔧 Creating admin user...');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${fullName}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('\n⚠️  User with this email already exists!');
      console.log('User details:');
      console.log(`- ID: ${existingUser.id}`);
      console.log(`- Email: ${existingUser.email}`);
      console.log(`- Role: ${existingUser.role}`);
      console.log(`- Status: ${existingUser.status}`);

      // Ask if they want to update to admin
      if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        existingUser.status = 'active';
        await existingUser.save();
        console.log('\n✅ User updated to admin role!');
      }

      process.exit(0);
    }

    // Generate user ID
    const userCount = await User.countDocuments();
    const userId = `USR-${String(userCount + 1).padStart(4, '0')}`;

    // Create admin user
    const adminUser = new User({
      id: userId,
      email: email.toLowerCase(),
      password: password, // Will be hashed by pre-save hook
      full_name: fullName,
      role: 'admin',
      status: 'active',
      phone: '',
      department: 'Administration'
    });

    await adminUser.save();

    // Create or update admin permissions
    let adminPermissions = await Permission.findOne({ user_id: adminUser.id });

    if (!adminPermissions) {
      // Generate permission ID
      const permCount = await Permission.countDocuments();
      const permId = `PERM-${String(permCount + 1).padStart(4, '0')}`;

      adminPermissions = new Permission({
        id: permId,
        user_id: adminUser.id,
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
          users: true,
          roles: true
        },
        action_permissions: {
          product_view: true,
          product_create: true,
          product_edit: true,
          product_delete: true,
          order_view: true,
          order_create: true,
          order_edit: true,
          order_delete: true,
          customer_view: true,
          customer_create: true,
          customer_edit: true,
          customer_delete: true,
          production_view: true,
          production_create: true,
          production_edit: true,
          production_delete: true,
          material_view: true,
          material_create: true,
          material_edit: true,
          material_delete: true,
          report_view: true,
          report_generate: true,
          settings_view: true,
          settings_edit: true,
          user_view: true,
          user_create: true,
          user_edit: true,
          user_delete: true,
          role_view: true,
          role_create: true,
          role_edit: true,
          role_delete: true
        }
      });

      await adminPermissions.save();
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📋 Login Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`User ID:  ${adminUser.id}`);
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     ${adminUser.role}`);
    console.log(`Status:   ${adminUser.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 Keep these credentials safe!');
    console.log('💡 You can now login with these credentials.');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin:', error);
    process.exit(1);
  }
};

// Run the script
createAdmin();
