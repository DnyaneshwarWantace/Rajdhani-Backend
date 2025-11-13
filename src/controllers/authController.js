import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rajdhani_carpet_secret_key_2024';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended. Please contact administrator.'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Get user permissions
    let permissions = await Permission.findOne({ role: user.role });
    
    // If no permissions found for this role, create default based on role
    if (!permissions) {
      permissions = await createDefaultPermissions(user.role);
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Return user data and token
    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        permissions: permissions,
        token: token
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login'
    });
  }
};

// Register (Admin only - for creating new users)
const register = async (req, res) => {
  try {
    const { email, password, full_name, role, phone, department } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Generate unique user ID
    const userId = `USER-${Date.now()}`;

    // Create new user
    const newUser = new User({
      id: userId,
      email: email.toLowerCase(),
      password: password, // Will be hashed by pre-save hook
      full_name: full_name,
      role: role || 'operator',
      phone: phone || '',
      department: department || '',
      status: 'active',
      created_by: req.user ? req.user.id : 'system'
    });

    await newUser.save();

    // Get permissions for this role
    let permissions = await Permission.findOne({ role: newUser.role });
    
    // If no permissions found, create default
    if (!permissions) {
      permissions = await createDefaultPermissions(newUser.role);
    }

    res.status(201).json({
      success: true,
      data: {
        user: newUser.toJSON(),
        permissions: permissions
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during registration'
    });
  }
};

// Get current user (from token)
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user permissions
    const permissions = await Permission.findOne({ role: user.role });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        permissions: permissions
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while fetching user data'
    });
  }
};

// Logout (optional - mainly for logging purposes)
const logout = async (req, res) => {
  try {
    // In JWT, logout is handled on frontend by removing token
    // But we can log it for audit purposes
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during logout'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while changing password'
    });
  }
};

// Update current user profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, department, avatar } = req.body;

    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields only (users can't change their own role, email, or status)
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone || '';
    if (department !== undefined) user.department = department || '';
    if (avatar !== undefined) user.avatar = avatar || '';

    await user.save();

    // Get updated permissions
    const permissions = await Permission.findOne({ role: user.role });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        permissions: permissions
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while updating profile'
    });
  }
};

// Helper function to automatically set non-delete actions based on page permissions
const autoSetActionPermissions = (pagePermissions, actionPermissions) => {
  const actionToPageMap = {
    'production_view': 'production', 'production_create': 'production', 'production_edit': 'production',
    'machine_view': 'production', 'machine_create': 'production', 'machine_edit': 'production',
    'product_view': 'products', 'product_create': 'products', 'product_edit': 'products',
    'individual_product_view': 'products', 'individual_product_create': 'products', 'individual_product_edit': 'products',
    'order_view': 'orders', 'order_create': 'orders', 'order_edit': 'orders', 'order_approve': 'orders', 'order_deliver': 'orders',
    'material_view': 'materials', 'material_create': 'materials', 'material_edit': 'materials', 'material_restock': 'materials',
    'customer_view': 'customers', 'customer_create': 'customers', 'customer_edit': 'customers',
    'supplier_view': 'suppliers', 'supplier_create': 'suppliers', 'supplier_edit': 'suppliers',
  };

  // Start with provided action permissions
  const final = { ...actionPermissions };

  // Auto-set non-delete actions based on page permissions
  Object.keys(actionToPageMap).forEach(actionKey => {
    const pageKey = actionToPageMap[actionKey];
    if (pagePermissions[pageKey]) {
      // If page is enabled and action is not explicitly set, enable non-delete actions
      if (!actionKey.includes('delete') && final[actionKey] === undefined) {
        final[actionKey] = true;
      }
    }
  });

  return final;
};

// Helper function to create default permissions
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
      // Admin has access to everything
      defaultPermissions.page_permissions = {
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
      // Manager has most permissions except user management
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: true,
        materials: true,
        orders: true,
        customers: true,
        suppliers: true,
        machines: true,
        reports: true,
        settings: false,
        users: false,
        roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: false,
        production_view: true, production_create: true, production_edit: true, production_delete: false, production_start: true, production_complete: true,
        material_view: true, material_create: true, material_edit: true, material_delete: false, material_restock: true,
        order_view: true, order_create: true, order_edit: true, order_delete: false, order_approve: true, order_deliver: true,
        customer_view: true, customer_create: true, customer_edit: true, customer_delete: false,
        supplier_view: true, supplier_create: true, supplier_edit: true, supplier_delete: false,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: true, machine_edit: true,
        individual_product_view: true, individual_product_create: true, individual_product_edit: true, individual_product_delete: false
      };
      break;

    case 'production_manager':
      // Production manager focuses on production
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: true,
        materials: true,
        orders: false,
        customers: false,
        suppliers: false,
        machines: true,
        reports: true,
        settings: false,
        users: false,
        roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: false, product_edit: false, product_delete: false,
        production_view: true, production_create: true, production_edit: true, production_delete: false, production_start: true, production_complete: true,
        material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        report_view: true, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: true, machine_edit: true,
        individual_product_view: true, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
      break;

    case 'operator':
      // Operator can view and execute tasks
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: true,
        materials: true,
        orders: false,
        customers: false,
        suppliers: false,
        machines: true,
        reports: false,
        settings: false,
        users: false,
        roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: false, product_edit: false, product_delete: false,
        production_view: true, production_create: false, production_edit: false, production_delete: false, production_start: true, production_complete: false,
        material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        report_view: false, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: false, machine_edit: false, machine_delete: false,
        individual_product_view: true, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
      break;

    case 'viewer':
      // Viewer can only view
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: true,
        materials: true,
        orders: true,
        customers: true,
        suppliers: true,
        machines: true,
        reports: true,
        settings: false,
        users: false,
        roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: false, product_edit: false, product_delete: false,
        production_view: true, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: true, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: true, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        report_view: true, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: true, machine_create: false, machine_edit: false, machine_delete: false,
        individual_product_view: true, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      };
      break;

    case 'inventory_manager':
      // Inventory manager focuses on products and materials
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: true,
        production: false,
        materials: true,
        orders: false,
        customers: true, // Has access to customers page (but only suppliers section)
        suppliers: true,
        machines: false,
        reports: true,
        settings: false,
        users: false,
        roles: false
      };
      defaultPermissions.action_permissions = {
        product_view: true, product_create: true, product_edit: true, product_delete: false,
        production_view: false, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: true, material_create: true, material_edit: true, material_delete: false, material_restock: true,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        customer_view: true, customer_create: false, customer_edit: false, customer_delete: false,
        supplier_view: true, supplier_create: true, supplier_edit: true, supplier_delete: false,
        report_view: true, report_export: true,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: false, machine_create: false, machine_edit: false,
        individual_product_view: true, individual_product_create: true, individual_product_edit: true, individual_product_delete: false
      };
      break;

    case 'sales_manager':
      // Sales manager focuses on orders, customers, and sales
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
        users: false,
        roles: false
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

    default:
      // Default minimal permissions
      defaultPermissions.page_permissions = {
        dashboard: true,
        products: false,
        production: false,
        materials: false,
        orders: false,
        customers: false,
        suppliers: false,
        machines: false,
        reports: false,
        settings: false,
        users: false,
        roles: false
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

  // Auto-set non-delete actions based on page permissions (only if not explicitly set to false)
  // This ensures roles like "viewer" can have page access but explicit create/edit = false
  const explicitlySetActions = { ...defaultPermissions.action_permissions };
  const autoSetActions = autoSetActionPermissions(
    defaultPermissions.page_permissions,
    {}
  );
  
  // Merge: keep explicit settings, only auto-set if not explicitly set
  defaultPermissions.action_permissions = {
    ...autoSetActions,
    ...explicitlySetActions // Explicit settings override auto-set
  };

  const permission = new Permission(defaultPermissions);
  await permission.save();
  
  return permission;
};

export {
  login,
  register,
  getCurrentUser,
  logout,
  changePassword,
  updateProfile
};

