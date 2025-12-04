import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';
import User from '../src/models/User.js';
import Permission from '../src/models/Permission.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   CREATE ADMIN USER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const email = await question('Enter admin email: ');
    const fullName = await question('Enter full name: ');
    const password = await question('Enter password: ');

    // Check if exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log('\n⚠️  Email already exists!');

      if (existing.role !== 'admin') {
        const update = await question('Update to admin role? (yes/no): ');
        if (update.toLowerCase() === 'yes') {
          existing.role = 'admin';
          existing.status = 'active';
          await existing.save();
          console.log('\n✅ User updated to admin!');
        }
      } else {
        console.log('User is already an admin.');
      }

      rl.close();
      process.exit(0);
    }

    // Create new admin
    const userCount = await User.countDocuments();
    const userId = `USR-${String(userCount + 1).padStart(4, '0')}`;

    const admin = new User({
      id: userId,
      email: email.toLowerCase(),
      password: password,
      full_name: fullName,
      role: 'admin',
      status: 'active',
      department: 'Administration'
    });

    await admin.save();

    // Create permissions
    await Permission.create({
      user_id: admin.id,
      role: 'admin',
      pages: {
        dashboard: { view: true, create: true, edit: true, delete: true },
        orders: { view: true, create: true, edit: true, delete: true },
        customers: { view: true, create: true, edit: true, delete: true },
        suppliers: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        production: { view: true, create: true, edit: true, delete: true },
        materials: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, create: true, edit: true, delete: true }
      }
    });

    console.log('\n✅ Admin created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     ${admin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
};

createAdmin();
