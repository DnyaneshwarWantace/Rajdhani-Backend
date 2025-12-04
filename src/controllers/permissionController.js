import Permission from '../models/Permission.js';
import Role from '../models/Role.js';

// Get all permissions
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ role: 1 });
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
};

// Get permissions by role
const getPermissionsByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    const permissions = await Permission.findOne({ role });
    
    if (!permissions) {
      return res.status(404).json({
        success: false,
        error: 'Permissions not found for this role'
      });
    }
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get permissions by role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
};

// Update permissions for a role
const updatePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { page_permissions, action_permissions } = req.body;

    let permissions = await Permission.findOne({ role });
    
    // Map of action to page
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

    // Start with existing permissions or create new
    let finalPagePermissions = {};
    let finalActionPermissions = {};
    
    if (permissions) {
      finalPagePermissions = { ...permissions.page_permissions };
      finalActionPermissions = { ...permissions.action_permissions };
    }
    
    // Update page permissions
    if (page_permissions) {
      finalPagePermissions = {
        ...finalPagePermissions,
        ...page_permissions
      };
    }
    
    // Update action permissions
    if (action_permissions) {
      finalActionPermissions = {
        ...finalActionPermissions,
        ...action_permissions
      };
    }
    
    // Automatically set non-delete action permissions based on page permissions
    // Page access = full access (create, edit, view) except delete
    Object.keys(actionToPageMap).forEach(actionKey => {
      const pageKey = actionToPageMap[actionKey];
      if (finalPagePermissions[pageKey]) {
        // If page is enabled, enable all non-delete actions
        if (!actionKey.includes('delete')) {
          finalActionPermissions[actionKey] = true;
        }
        // Delete actions are kept as set by user (from action_permissions)
      } else {
        // If page is disabled, disable all related actions
        finalActionPermissions[actionKey] = false;
      }
    });
    
    // Update or create permissions
    if (!permissions) {
      const permissionId = `PERM-${role.toUpperCase()}-${Date.now()}`;
      permissions = new Permission({
        id: permissionId,
        role,
        page_permissions: finalPagePermissions,
        action_permissions: finalActionPermissions
      });
    } else {
      permissions.page_permissions = finalPagePermissions;
      permissions.action_permissions = finalActionPermissions;
    }

    await permissions.save();

    res.json({
      success: true,
      data: permissions,
      message: 'Permissions updated successfully'
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update permissions'
    });
  }
};

// Reset permissions to default for a role
const resetPermissions = async (req, res) => {
  try {
    const { role } = req.params;

    // Delete existing permissions
    await Permission.findOneAndDelete({ role });

    // Will be recreated with defaults on next login
    res.json({
      success: true,
      message: 'Permissions reset to default. New permissions will be created on next user login.'
    });
  } catch (error) {
    console.error('Reset permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset permissions'
    });
  }
};

// Get available roles (now from database)
const getAvailableRoles = async (req, res) => {
  try {
    // Only return admin and user roles
    const roles = await Role.find({ 
      is_active: true,
      name: { $in: ['admin', 'user'] }
    }).sort({ label: 1 });
    
    // Format for frontend
    const formattedRoles = roles.map(role => ({
      value: role.name,
      label: role.label,
      description: role.description
    }));

    res.json({
      success: true,
      data: formattedRoles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
};

// Get available pages
const getAvailablePages = async (req, res) => {
  try {
    const pages = [
      { key: 'dashboard', label: 'Dashboard', description: 'Main dashboard view' },
      { key: 'products', label: 'Products', description: 'Product inventory management' },
      { key: 'production', label: 'Production', description: 'Production management' },
      { key: 'materials', label: 'Materials', description: 'Raw materials inventory' },
      { key: 'orders', label: 'Orders', description: 'Order management' },
      { key: 'customers', label: 'Customers', description: 'Customer management' },
      { key: 'suppliers', label: 'Suppliers', description: 'Supplier management' },
      { key: 'machines', label: 'Machines', description: 'Machine management' },
      { key: 'reports', label: 'Reports', description: 'Reports and analytics' },
      { key: 'settings', label: 'Settings', description: 'System settings' },
      { key: 'users', label: 'Users', description: 'User management' },
      { key: 'roles', label: 'Roles', description: 'Role management' }
    ];

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pages'
    });
  }
};

// Get available actions
const getAvailableActions = async (req, res) => {
  try {
    const actions = {
      products: [
        { key: 'product_view', label: 'View Products' },
        { key: 'product_create', label: 'Create Products' },
        { key: 'product_edit', label: 'Edit Products' },
        { key: 'product_delete', label: 'Delete Products' }
      ],
      production: [
        { key: 'production_view', label: 'View Production' },
        { key: 'production_create', label: 'Create Production' },
        { key: 'production_edit', label: 'Edit Production' },
        { key: 'production_delete', label: 'Delete Production' }
        // Note: production_start and production_complete might be handled via edit permission
      ],
      materials: [
        { key: 'material_view', label: 'View Materials' },
        { key: 'material_create', label: 'Create Materials' },
        { key: 'material_edit', label: 'Edit Materials' },
        { key: 'material_delete', label: 'Delete Materials' },
        { key: 'material_restock', label: 'Restock Materials' }
      ],
      orders: [
        { key: 'order_view', label: 'View Orders' },
        { key: 'order_create', label: 'Create Orders' },
        { key: 'order_edit', label: 'Edit Orders' },
        { key: 'order_delete', label: 'Delete Orders' },
        { key: 'order_approve', label: 'Approve Orders' },
        { key: 'order_deliver', label: 'Deliver Orders' }
      ],
      reports: [
        { key: 'report_view', label: 'View Reports' },
        { key: 'report_export', label: 'Export Reports' }
      ],
      customers: [
        { key: 'customer_view', label: 'View Customers' },
        { key: 'customer_create', label: 'Create Customers' },
        { key: 'customer_edit', label: 'Edit Customers' },
        { key: 'customer_delete', label: 'Delete Customers' }
      ],
      suppliers: [
        { key: 'supplier_view', label: 'View Suppliers' },
        { key: 'supplier_create', label: 'Create Suppliers' },
        { key: 'supplier_edit', label: 'Edit Suppliers' },
        { key: 'supplier_delete', label: 'Delete Suppliers' }
      ],
      users: [
        { key: 'user_view', label: 'View Users' },
        { key: 'user_create', label: 'Create Users' },
        { key: 'user_edit', label: 'Edit Users' },
        { key: 'user_delete', label: 'Delete Users' }
      ],
      roles: [
        { key: 'role_view', label: 'View Roles' },
        { key: 'role_create', label: 'Create Roles' },
        { key: 'role_edit', label: 'Edit Roles' },
        { key: 'role_delete', label: 'Delete Roles' }
      ],
      machines: [
        { key: 'machine_view', label: 'View Machines' },
        { key: 'machine_create', label: 'Create Machines' },
        { key: 'machine_edit', label: 'Edit Machines' }
        // Note: machine_delete endpoint doesn't exist
      ],
      'individual_products': [
        { key: 'individual_product_view', label: 'View Individual Products' },
        { key: 'individual_product_create', label: 'Create Individual Products' },
        { key: 'individual_product_edit', label: 'Edit Individual Products' },
        { key: 'individual_product_delete', label: 'Delete Individual Products' }
      ]
    };

    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actions'
    });
  }
};

export {
  getAllPermissions,
  getPermissionsByRole,
  updatePermissions,
  resetPermissions,
  getAvailableRoles,
  getAvailablePages,
  getAvailableActions
};

