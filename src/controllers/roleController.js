import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ label: 1 });
    
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
};

// Get active roles only
const getActiveRoles = async (req, res) => {
  try {
    // Only return admin and user roles
    const roles = await Role.find({ 
      is_active: true,
      name: { $in: ['admin', 'user'] }
    }).sort({ label: 1 });
    
    // Format for frontend dropdown
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
    console.error('Get active roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active roles'
    });
  }
};

// Get role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findOne({ id });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role'
    });
  }
};

// Create new role
const createRole = async (req, res) => {
  try {
    const { name, label, description } = req.body;
    
    // Validate input
    if (!name || !label) {
      return res.status(400).json({
        success: false,
        error: 'Role name and label are required'
      });
    }
    
    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(409).json({
        success: false,
        error: 'Role with this name already exists'
      });
    }
    
    // Generate unique role ID
    const roleId = `ROLE-${Date.now()}`;
    
    // Create new role
    const newRole = new Role({
      id: roleId,
      name: name.toLowerCase().replace(/\s+/g, '_'), // Convert to snake_case
      label: label,
      description: description || '',
      is_active: true,
      is_system: false,
      created_by: req.user ? req.user.id : 'system'
    });
    
    await newRole.save();
    
    // Create default permissions for this new role
    const defaultPermissions = new Permission({
      id: `PERM-${newRole.name.toUpperCase()}-${Date.now()}`,
      role: newRole.name,
      page_permissions: {
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
      },
      action_permissions: {
        // All false by default for new custom roles
        product_view: false, product_create: false, product_edit: false, product_delete: false,
        production_view: false, production_create: false, production_edit: false, production_delete: false, production_start: false, production_complete: false,
        material_view: false, material_create: false, material_edit: false, material_delete: false, material_restock: false,
        order_view: false, order_create: false, order_edit: false, order_delete: false, order_approve: false, order_deliver: false,
        customer_view: false, customer_create: false, customer_edit: false, customer_delete: false,
        supplier_view: false, supplier_create: false, supplier_edit: false, supplier_delete: false,
        report_view: false, report_export: false,
        user_view: false, user_create: false, user_edit: false, user_delete: false,
        role_view: false, role_create: false, role_edit: false, role_delete: false,
        machine_view: false, machine_create: false, machine_edit: false,
        individual_product_view: false, individual_product_create: false, individual_product_edit: false, individual_product_delete: false
      }
    });
    
    await defaultPermissions.save();
    
    res.status(201).json({
      success: true,
      data: newRole,
      message: 'Role created successfully with default permissions'
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create role'
    });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, description, is_active } = req.body;
    
    const role = await Role.findOne({ id });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // System roles cannot be deactivated
    if (role.is_system && is_active === false) {
      return res.status(400).json({
        success: false,
        error: 'System roles cannot be deactivated'
      });
    }
    
    // Update fields
    if (label !== undefined) role.label = label;
    if (description !== undefined) role.description = description;
    if (is_active !== undefined) role.is_active = is_active;
    
    await role.save();
    
    res.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role'
    });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findOne({ id });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // System roles cannot be deleted
    if (role.is_system) {
      return res.status(400).json({
        success: false,
        error: 'System roles cannot be deleted'
      });
    }
    
    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role. Please reassign users first.`
      });
    }
    
    // Delete role and its permissions
    await Role.findOneAndDelete({ id });
    await Permission.findOneAndDelete({ role: role.name });
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role'
    });
  }
};

export {
  getAllRoles,
  getActiveRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};

