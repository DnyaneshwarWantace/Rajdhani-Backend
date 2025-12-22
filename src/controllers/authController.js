import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Permission from '../models/Permission.js';
import OTP from '../models/OTP.js';
import { generateOTP, sendOTPEmail } from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rajdhani_carpet_secret_key_2024';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

// Fake admin for development (bypass OTP)
const FAKE_ADMIN = {
  email: 'admin@rajdhani.com',
  password: 'admin123'
};

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

// Login with Email + Password (Direct, no OTP)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email, passwordLength: password?.length });

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Preserve email case - only trim whitespace
    const emailTrimmed = email.trim();
    console.log('📧 Looking for user:', emailTrimmed);

    // Check if it's the fake admin (for development) - compare case-insensitive
    if (emailTrimmed.toLowerCase() === FAKE_ADMIN.email.toLowerCase() && password === FAKE_ADMIN.password) {
      // Find or create fake admin user - search case-insensitive
      let fakeAdminUser = await User.findOne({ email: { $regex: new RegExp(`^${FAKE_ADMIN.email}$`, 'i') } });

      if (!fakeAdminUser) {
        const userId = `USR-ADMIN-001`;
        fakeAdminUser = new User({
          id: userId,
          email: FAKE_ADMIN.email,
          password: FAKE_ADMIN.password,
          full_name: 'System Administrator',
          role: 'admin',
          status: 'active'
        });
        await fakeAdminUser.save();
      }

      // Get admin permissions
      let permissions = await Permission.findOne({ role: 'admin' });
      if (!permissions) {
        permissions = await createDefaultPermissions('admin');
      }

      const token = generateToken(fakeAdminUser);

      return res.json({
        success: true,
        data: {
          user: fakeAdminUser.toJSON(),
          permissions: permissions,
          token: token
        },
        message: 'Login successful (Development Mode)'
      });
    }

    // Find user by email (case-insensitive search but preserve original case)
    const user = await User.findOne({ email: { $regex: new RegExp(`^${emailTrimmed}$`, 'i') } });
    console.log('👤 User found:', user ? `${user.email} (${user.role})` : 'NOT FOUND');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('❌ User inactive:', user.status);
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended. Please contact administrator.'
      });
    }

    // Compare password
    console.log('🔑 Comparing password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('✅ Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Get user permissions
    let permissions = await Permission.findOne({ role: user.role });

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

// Request OTP for login (Optional - user can login with OTP instead of password)
const requestLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No account found with this email'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended. Please contact administrator.'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: emailLower });

    // Save OTP to database
    const otpDoc = new OTP({
      email: emailLower,
      otp: otp,
      attempts: 0
    });
    await otpDoc.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(emailLower, otp, user.full_name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email address',
      email: emailLower
    });
  } catch (error) {
    console.error('Request login OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};

// Verify OTP and complete login
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find the most recent OTP for this email
    const otpDoc = await OTP.findOne({
      email: emailLower,
      verified: false
    }).sort({ created_at: -1 });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        error: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check attempts
    if (otpDoc.attempts >= 3) {
      await OTP.deleteMany({ email: emailLower });
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpDoc.otp !== otp.trim()) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid OTP. Please try again.',
        attemptsLeft: 3 - otpDoc.attempts
      });
    }

    // Mark OTP as verified
    otpDoc.verified = true;
    await otpDoc.save();

    // Find user
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user permissions
    let permissions = await Permission.findOne({ role: user.role });

    if (!permissions) {
      permissions = await createDefaultPermissions(user.role);
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Clean up used OTP
    await OTP.deleteMany({ email: emailLower });

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
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};

// Self-registration: Request OTP for new user registration
const requestRegistrationOTP = async (req, res) => {
  try {
    const { email, full_name } = req.body;

    // Validate input
    if (!email || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Email and full name are required'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: emailLower });

    // Save OTP to database
    const otpDoc = new OTP({
      email: emailLower,
      otp: otp,
      attempts: 0
    });
    await otpDoc.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(emailLower, otp, full_name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      email: emailLower
    });
  } catch (error) {
    console.error('Request registration OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};

// Complete user registration after OTP verification
const completeRegistration = async (req, res) => {
  try {
    const { email, otp, full_name, password, phone, department } = req.body;

    // Validate input
    if (!email || !otp || !full_name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, OTP, full name, and password are required'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find and verify OTP
    const otpDoc = await OTP.findOne({
      email: emailLower,
      verified: false
    }).sort({ created_at: -1 });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        error: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check attempts
    if (otpDoc.attempts >= 3) {
      await OTP.deleteMany({ email: emailLower });
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpDoc.otp !== otp.trim()) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid OTP. Please try again.',
        attemptsLeft: 3 - otpDoc.attempts
      });
    }

    // Mark OTP as verified
    otpDoc.verified = true;
    await otpDoc.save();

    // Check if user already exists (double-check)
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Generate user ID
    const userCount = await User.countDocuments();
    const userId = `USR-${Date.now()}-${String(userCount + 1).padStart(3, '0')}`;

    // Create new user with role 'user' (not admin)
    const newUser = new User({
      id: userId,
      email: emailLower,
      password: password, // Will be hashed by the model's pre-save hook
      full_name: full_name,
      phone: phone || null,
      department: department || null,
      role: 'user', // All self-registered users are 'user' role
      status: 'active'
    });

    await newUser.save();

    // Get default permissions for 'user' role
    let permissions = await Permission.findOne({ role: 'user' });
    if (!permissions) {
      permissions = await createDefaultPermissions('user');
    }

    // Generate token
    const token = generateToken(newUser);

    // Clean up OTP
    await OTP.deleteMany({ email: emailLower });

    // Return user data and token
    res.status(201).json({
      success: true,
      data: {
        user: newUser.toJSON(),
        permissions: permissions,
        token: token
      },
      message: 'Registration successful! Welcome to Rajdhani Carpets.'
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during registration. Please try again.'
    });
  }
};

// Forgot Password: Request OTP
const forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset code.'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing OTPs
    await OTP.deleteMany({ email: emailLower });

    // Save OTP
    const otpDoc = new OTP({
      email: emailLower,
      otp: otp,
      attempts: 0
    });
    await otpDoc.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(emailLower, otp, user.full_name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send reset code. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      email: emailLower
    });
  } catch (error) {
    console.error('Forgot password request error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};

// Forgot Password: Verify OTP and Reset Password
const forgotPasswordReset = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Email, OTP, and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find OTP
    const otpDoc = await OTP.findOne({
      email: emailLower,
      verified: false
    }).sort({ created_at: -1 });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        error: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check attempts
    if (otpDoc.attempts >= 3) {
      await OTP.deleteMany({ email: emailLower });
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpDoc.otp !== otp.trim()) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid OTP. Please try again.',
        attemptsLeft: 3 - otpDoc.attempts
      });
    }

    // Find user
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update password
    user.password = new_password; // Will be hashed by pre-save hook
    await user.save();

    // Clean up OTP
    await OTP.deleteMany({ email: emailLower });

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Forgot password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};

// Admin: Create new user and send welcome email
const createUser = async (req, res) => {
  try {
    const { email, full_name, phone, department } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Email and full name are required'
      });
    }

    // Preserve email case - only trim whitespace
    const emailTrimmed = email.trim();

    // Check if user already exists (case-insensitive search)
    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${emailTrimmed}$`, 'i') } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists'
      });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Send welcome email FIRST - only create user if email is sent successfully
    // Use original email case for display, but search is case-insensitive
    const { sendWelcomeEmail } = await import('../utils/emailService.js');
    const emailResult = await sendWelcomeEmail(emailTrimmed, full_name, tempPassword);

    console.log('📧 Welcome email result:', emailResult);

    // STRICT: Only create user if email was sent successfully
    // If email fails (not skipped), DO NOT create the user
    if (!emailResult.success) {
      // If email was skipped (not configured), log warning but still allow creation
      if (emailResult.skipped) {
        console.warn(`⚠️ Email service not configured. User will be created without sending welcome email. Email: ${emailTrimmed}`);
      } else {
        // Email ACTUALLY failed (SendGrid error, network issue, etc.) - DO NOT create user
        console.error(`❌ Email sending FAILED for ${emailTrimmed}. User will NOT be created.`);
        console.error(`   Error: ${emailResult.error}`);
        return res.status(500).json({
          success: false,
          error: `Failed to send welcome email to ${emailTrimmed}. User was NOT created. Error: ${emailResult.error || 'Unknown email sending error'}. Please check your SendGrid configuration and try again.`
        });
      }
    } else {
      console.log(`✅ Welcome email sent successfully to ${emailTrimmed}. Proceeding to create user.`);
    }
    // Generate user ID
    const userCount = await User.countDocuments();
    const userId = `USR-${Date.now()}-${String(userCount + 1).padStart(3, '0')}`;

    // Get role from request body (default to 'user')
    const role = req.body.role || 'user';

    // Create user with created_by set to current admin's ID
    // Preserve original email case (capital stays capital, small stays small)
    const newUser = new User({
      id: userId,
      email: emailTrimmed, // Preserve original case
      password: tempPassword,
      full_name: full_name,
      phone: phone || null,
      department: department || null,
      role: role,
      status: 'active',
      created_by: req.user ? req.user.id : 'system'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
          status: newUser.status,
          created_by: newUser.created_by
        }
      },
      message: 'User created successfully. Welcome email sent with temporary password.'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while creating user.'
    });
  }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
  try {
    console.log('📋 Getting all users...');
    const users = await User.find({})
      .select('-password')
      .sort({ created_at: -1 });

    console.log(`✅ Found ${users.length} users`);

    // Get creator information for each user
    const usersWithCreator = await Promise.all(users.map(async (user) => {
      try {
        const userObj = user.toJSON();
        if (user.created_by && user.created_by !== 'system') {
          try {
            const creator = await User.findOne({ id: user.created_by }).select('full_name email');
            if (creator) {
              userObj.created_by_user = {
                id: creator.id,
                full_name: creator.full_name,
                email: creator.email
              };
            }
          } catch (creatorError) {
            console.error(`Error fetching creator for user ${user.id}:`, creatorError);
            // Continue without creator info
          }
        }
        return userObj;
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        return user.toJSON(); // Return basic user info if processing fails
      }
    }));

    res.json({
      success: true,
      data: usersWithCreator
    });
  } catch (error) {
    console.error('Get all users error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: `An error occurred while fetching users: ${error.message}`
    });
  }
};

// Admin: Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Don't allow deleting yourself
    if (id === currentUser.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get current user's full record to check role
    const currentUserRecord = await User.findOne({ id: currentUser.id });
    if (!currentUserRecord) {
      return res.status(401).json({
        success: false,
        error: 'Current user not found'
      });
    }

    // Rule 1: Cannot delete your creator (hierarchical protection)
    if (user.id === currentUserRecord.created_by) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete the user who created your account'
      });
    }

    // Rule 2: Cannot delete admin users directly - must demote first
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin users. Please change their role to "user" first, then delete them.'
      });
    }

    // Rule 3: Admins can delete any non-admin user (even if they didn't create them)
    if (currentUserRecord.role === 'admin') {
      // Admin can delete any non-admin user
      await User.findOneAndDelete({ id });
      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    // Rule 4: Non-admin users can only delete users they created
    if (user.created_by !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete users that you created'
      });
    }

    await User.findOneAndDelete({ id });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while deleting user.'
    });
  }
};

// Admin: Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "active" or "suspended"'
      });
    }

    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent suspending admin users
    if (user.role === 'admin' && status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Cannot suspend admin users'
      });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      data: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while updating user status.'
    });
  }
};

// Admin: Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ id });

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
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          phone: user.phone,
          department: user.department,
          status: user.status,
          created_at: user.created_at,
          created_by: user.created_by
        },
        permissions
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while fetching user'
    });
  }
};

// Admin: Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const currentUser = req.user;

    // Don't allow password update through this route
    delete updates.password;
    delete updates.id; // Don't allow ID change
    delete updates.created_by; // Don't allow changing creator

    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if current user created this user
    if (user.created_by !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only modify users that you created'
      });
    }

    // If changing role to/from admin, check if user is trying to depromote themselves
    if (updates.role && updates.role !== user.role) {
      // Allow role changes (including promoting to admin or depromoting from admin)
      // as long as the current user created this user
    }

    // Update user fields
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    await user.save();

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        department: user.department,
        status: user.status,
        created_by: user.created_by
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while updating user'
    });
  }
};

// Admin: Reset user password
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while resetting password'
    });
  }
};

export {
  login,
  register,
  getCurrentUser,
  logout,
  changePassword,
  updateProfile,
  requestLoginOTP,
  verifyOTP,
  forgotPasswordRequest,
  forgotPasswordReset,
  createUser,
  getAllUsers,
  deleteUser,
  updateUserStatus,
  getUserById,
  updateUser,
  resetUserPassword
};

