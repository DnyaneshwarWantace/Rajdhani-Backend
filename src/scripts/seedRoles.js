import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role.js';
import connectDB from '../config/database.js';

dotenv.config();

// Seed initial roles
const seedRoles = async () => {
  try {
    await connectDB();
    console.log('🔄 Seeding roles...\n');

    const systemRoles = [
      {
        id: 'ROLE-ADMIN-001',
        name: 'admin',
        label: 'Administrator',
        description: 'Full system access',
        is_active: true,
        is_system: true,
        created_by: 'system'
      },
      {
        id: 'ROLE-MANAGER-001',
        name: 'manager',
        label: 'Manager',
        description: 'Manage operations and users',
        is_active: true,
        is_system: true,
        created_by: 'system'
      },
      {
        id: 'ROLE-PROD-MGR-001',
        name: 'production_manager',
        label: 'Production Manager',
        description: 'Manage production processes',
        is_active: true,
        is_system: true,
        created_by: 'system'
      },
      {
        id: 'ROLE-INV-MGR-001',
        name: 'inventory_manager',
        label: 'Inventory Manager',
        description: 'Manage materials and products',
        is_active: true,
        is_system: true,
        created_by: 'system'
      },
      {
        id: 'ROLE-SALES-MGR-001',
        name: 'sales_manager',
        label: 'Sales Manager',
        description: 'Manage orders and customers',
        is_active: true,
        is_system: true,
        created_by: 'system'
      },
      {
        id: 'ROLE-OPERATOR-001',
        name: 'operator',
        label: 'Operator',
        description: 'Execute production tasks',
        is_active: true,
        is_system: true,
        created_by: 'system'
      },
      {
        id: 'ROLE-VIEWER-001',
        name: 'viewer',
        label: 'Viewer',
        description: 'View-only access',
        is_active: true,
        is_system: true,
        created_by: 'system'
      }
    ];

    for (const roleData of systemRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        console.log(`⏭️  Role "${roleData.label}" already exists, skipping...`);
      } else {
        const role = new Role(roleData);
        await role.save();
        console.log(`✅ Created role: ${roleData.label}`);
      }
    }

    console.log('\n✅ Role seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }
};

seedRoles();

