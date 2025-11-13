import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
// Helper function to create default permissions (same as in authController)
const createDefaultPermissions = async (role) => {
  const permissionId = `PERM-${role.toUpperCase()}-${Date.now()}`;
  
  let defaultPermissions = {
    id: permissionId,
    role: role,
    page_permissions: {},
    action_permissions: {}
  };

  // Set default permissions based on role
  switch (role) {
    case 'admin':
      defaultPermissions.page_permissions = {
        dashboard: true, products: true, production: true, materials: true, orders: true,
        customers: true, suppliers: true, machines: true, reports: true, settings: true,
        users: true, roles: true
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: true,
        production_view: true, production_create: true, production_edit: true, production_delete: true, production_start: true, production_complete: true,
        material_view: true, material_create: true, material_edit: true, material_delete: true, material_restock: true,
        order_view: true, order_create: true, order_edit: true, order_delete: true, order_approve: true, order_deliver: true,
        customer_view: true, customer_create: true, customer_edit: true, customer_delete: true,
        supplier_view: true, supplier_create: true, supplier_edit: true, supplier_delete: true,
        report_view: true, report_export: true,
        user_view: true, user_create: true, user_edit: true, user_delete: true,
        role_view: true, role_create: true, role_edit: true, role_delete: true,
        machine_view: true, machine_create: true, machine_edit: true,
        individual_product_view: true, individual_product_create: true, individual_product_edit: true, individual_product_delete: true
      };
      break;

    case 'manager':
      defaultPermissions.page_permissions = {
        dashboard: true, products: true, production: true, materials: true, orders: true,
        customers: true, suppliers: true, machines: true, reports: true, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: true,
        production_view: true, production_create: true, production_edit: true, production_delete: true, production_start: true, production_complete: true,
        material_view: true, material_create: true, material_edit: true, material_delete: true, material_restock: true,
        order_view: true, order_create: true, order_edit: true, order_delete: true, order_approve: true, order_deliver: true,
        customer_view: true, customer_create: true, customer_edit: true, customer_delete: true,
        supplier_view: true, supplier_create: true, supplier_edit: true, supplier_delete: true,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: true, machine_edit: true,
        individual_product_view: true, individual_product_create: true, individual_product_edit: true, individual_product_delete: true
      };
      break;

    case 'production_manager':
      defaultPermissions.page_permissions = {
        dashboard: true, products: true, production: true, materials: true, orders: false,
        customers: false, suppliers: false, machines: true, reports: true, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: false,
        production_view: true, production_create: true, production_edit: true, production_delete: false, production_start: true, production_complete: true,
        material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        customer_view: false, customer_create: false, customer_edit: false, customer_delete: false,
        supplier_view: false, supplier_create: false, supplier_edit: false, supplier_delete: false,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: true, machine_edit: true,
        individual_product_view: true, individual_product_create: true, individual_product_edit: true, individual_product_delete: false
      };
      break;

    case 'inventory_manager':
      defaultPermissions.page_permissions = {
        dashboard: true, products: true, production: false, materials: true, orders: false,
        customers: false, suppliers: true, machines: false, reports: true, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: false,
        production_view: false, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: true, material_create: true, material_edit: true, material_delete: false, material_restock: true,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        customer_view: false, customer_create: false, customer_edit: false, customer_delete: false,
        supplier_view: true, supplier_create: true, supplier_edit: true, supplier_delete: false,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: false, machine_create: false, machine_edit: false,
        individual_product_view: true, individual_product_create: true, individual_product_edit: true, individual_product_delete: false
      };
      break;

    case 'sales_manager':
      defaultPermissions.page_permissions = {
        dashboard: true, products: true, production: false, materials: false, orders: true,
        customers: true, suppliers: false, machines: false, reports: true, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: false, product_edit: false, product_delete: false,
        production_view: false, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: false, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: true, order_create: true, order_edit: true, order_delete: false, order_approve: true, order_deliver: true,
        customer_view: true, customer_create: true, customer_edit: true, customer_delete: false,
        supplier_view: false, supplier_create: false, supplier_edit: false, supplier_delete: false,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: false, machine_create: false, machine_edit: false,
        individual_product_view: true, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
      break;

    case 'operator':
      defaultPermissions.page_permissions = {
        dashboard: true, products: false, production: true, materials: false, orders: false,
        customers: false, suppliers: false, machines: false, reports: false, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: false, product_create: false, product_edit: false, product_delete: false,
        production_view: true, production_create: false, production_edit: true, production_delete: false, production_start: true, production_complete: true,
        material_view: false, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        customer_view: false, customer_create: false, customer_edit: false, customer_delete: false,
        supplier_view: false, supplier_create: false, supplier_edit: false, supplier_delete: false,
        report_view: false, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: false, machine_create: false, machine_edit: false,
        individual_product_view: false, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
      break;

    case 'viewer':
      defaultPermissions.page_permissions = {
        dashboard: true, products: true, production: true, materials: true, orders: true,
        customers: true, suppliers: true, machines: true, reports: true, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: false, product_edit: false, product_delete: false,
        production_view: true, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: true, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        customer_view: true, customer_create: false, customer_edit: false, customer_delete: false,
        supplier_view: true, supplier_create: false, supplier_edit: false, supplier_delete: false,
        report_view: true, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: false, machine_edit: false,
        individual_product_view: true, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
      break;

    default:
      // Default minimal permissions
      defaultPermissions.page_permissions = {
        dashboard: true, products: false, production: false, materials: false, orders: false,
        customers: false, suppliers: false, machines: false, reports: false, settings: false,
        users: false, roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: false, product_create: false, product_edit: false, product_delete: false,
        production_view: false, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: false, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        report_view: false, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: false, machine_create: false, machine_edit: false,
        individual_product_view: false, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
  }

  const permission = new Permission(defaultPermissions);
  await permission.save();
  
  return permission;
};

dotenv.config();

// Initialize database with roles, permissions, and admin user
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('🔄 Initializing database...\n');

    // Step 1: Create all system roles
    console.log('📋 Step 1: Creating system roles...');
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
        console.log(`   ⏭️  Role "${roleData.label}" already exists`);
      } else {
        const role = new Role(roleData);
        await role.save();
        console.log(`   ✅ Created role: ${roleData.label}`);
      }
    }
    console.log('');

    // Step 2: Create default permissions for all roles
    console.log('🔐 Step 2: Creating default permissions for all roles...');
    const allRoles = await Role.find({ is_active: true });
    
    for (const role of allRoles) {
      const existingPermission = await Permission.findOne({ role: role.name });
      
      if (existingPermission) {
        console.log(`   ⏭️  Permissions for "${role.label}" already exist`);
      } else {
        try {
          const permission = await createDefaultPermissions(role.name);
          console.log(`   ✅ Created permissions for "${role.label}"`);
        } catch (error) {
          console.error(`   ❌ Error creating permissions for "${role.label}":`, error.message);
        }
      }
    }
    console.log('');

    // Step 3: Create admin user if doesn't exist
    console.log('👤 Step 3: Creating admin user...');
    const existingAdmin = await User.findOne({ email: 'admin@rajdhani.com' });
    
    if (existingAdmin) {
      console.log('   ⏭️  Admin user already exists');
      // Ensure admin has correct role
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('   ✅ Updated admin user role');
      }
    } else {
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
      console.log('   ✅ Created admin user');
      console.log('   📧 Email: admin@rajdhani.com');
      console.log('   🔑 Password: admin123');
    }
    console.log('');

    // Step 4: Verify admin permissions
    console.log('🔍 Step 4: Verifying admin permissions...');
    const adminPermission = await Permission.findOne({ role: 'admin' });
    
    if (adminPermission) {
      const pageCount = Object.values(adminPermission.page_permissions).filter(v => v === true).length;
      const actionCount = Object.values(adminPermission.action_permissions).filter(v => v === true).length;
      console.log(`   ✅ Admin has ${pageCount} page permissions and ${actionCount} action permissions`);
    } else {
      console.log('   ⚠️  Admin permissions not found, creating...');
      await createDefaultPermissions('admin');
      console.log('   ✅ Admin permissions created');
    }
    console.log('');

    console.log('═'.repeat(60));
    console.log('✅ Database initialization completed successfully!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📝 Summary:');
    console.log(`   • Roles: ${allRoles.length} roles in database`);
    console.log('   • Permissions: Created for all roles');
    console.log('   • Admin User: Ready to use');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Email: admin@rajdhani.com');
    console.log('   Password: admin123');
    console.log('');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

initializeDatabase();

