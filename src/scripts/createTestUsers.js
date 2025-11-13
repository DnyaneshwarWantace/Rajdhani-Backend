import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'https://rajdhani.wantace.com/api';

// Test users to create for each role
const testUsers = [
  {
    email: 'manager@rajdhani.com',
    password: 'manager123',
    full_name: 'Test Manager',
    role: 'manager',
    department: 'Management'
  },
  {
    email: 'operator@rajdhani.com',
    password: 'operator123',
    full_name: 'Test Operator',
    role: 'operator',
    department: 'Production'
  },
  {
    email: 'viewer@rajdhani.com',
    password: 'viewer123',
    full_name: 'Test Viewer',
    role: 'viewer',
    department: 'Audit'
  },
  {
    email: 'production@rajdhani.com',
    password: 'production123',
    full_name: 'Test Production Manager',
    role: 'production_manager',
    department: 'Production'
  },
  {
    email: 'inventory@rajdhani.com',
    password: 'inventory123',
    full_name: 'Test Inventory Manager',
    role: 'inventory_manager',
    department: 'Inventory'
  },
  {
    email: 'sales@rajdhani.com',
    password: 'sales123',
    full_name: 'Test Sales Manager',
    role: 'sales_manager',
    department: 'Sales'
  }
];

// Create test users using admin credentials
const createTestUsers = async () => {
  try {
    console.log('🔐 Logging in as admin...\n');
    
    // Step 1: Login as admin
    // Try admin@123 first, then admin123 as fallback
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin@123';
    
    console.log(`   Trying password: ${adminPassword.replace(/./g, '*')}`);
    
    let loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@rajdhani.com',
        password: adminPassword
      })
    });

    // If login fails, try with admin123
    if (!loginResponse.ok) {
      console.log(`   Trying alternative password: admin123`);
      loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@rajdhani.com',
          password: 'admin123'
        })
      });
    }

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${errorData.error || 'Unknown error'}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    
    console.log('✅ Successfully logged in as admin\n');
    console.log('👤 Creating test users for all roles...\n');
    console.log('═'.repeat(60));

    // Step 2: Create test users for each role
    const results = {
      created: [],
      failed: []
    };

    for (const user of testUsers) {
      try {
        console.log(`\n📧 Creating ${user.role} user: ${user.email}...`);
        
        const createResponse = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(user)
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
          if (createData.error?.includes('already exists')) {
            console.log(`   ⚠️  User already exists: ${user.email}`);
            results.failed.push({ ...user, reason: 'User already exists' });
          } else {
            console.log(`   ❌ Failed: ${createData.error || 'Unknown error'}`);
            results.failed.push({ ...user, reason: createData.error || 'Unknown error' });
          }
        } else {
          console.log(`   ✅ Created successfully`);
          console.log(`   📝 Name: ${user.full_name}`);
          console.log(`   🔑 Password: ${user.password}`);
          results.created.push(user);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.failed.push({ ...user, reason: error.message });
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Created: ${results.created.length} users`);
    console.log(`❌ Failed: ${results.failed.length} users`);
    
    if (results.created.length > 0) {
      console.log('\n✅ Successfully Created Users:');
      results.created.forEach(user => {
        console.log(`   • ${user.email} (${user.role}) - Password: ${user.password}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed to Create Users:');
      results.failed.forEach(user => {
        console.log(`   • ${user.email} (${user.role}) - Reason: ${user.reason}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🎯 Test Users Credentials');
    console.log('═'.repeat(60));
    console.log('Admin User:');
    console.log('   Email: admin@rajdhani.com');
    console.log('   Password: admin@123');
    console.log('\nTest Users:');
    results.created.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });
    console.log('═'.repeat(60));
    console.log('\n✨ Done! You can now test permissions with these users.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Backend server is running on https://rajdhani.wantace.com');
    console.error('   2. Admin user exists: admin@rajdhani.com / admin@123');
    console.error('   3. API URL is correct\n');
    process.exit(1);
  }
};

// Run the script
createTestUsers();

