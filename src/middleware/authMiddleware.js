import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rajdhani_carpet_secret_key_2024';

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findOne({ id: decoded.id });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Check if user has required role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user has specific permission for an action
const checkPermission = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Admin always has permission
      if (req.user.role === 'admin') {
        return next();
      }

      // Get user's permissions
      const permissions = await Permission.findOne({ role: req.user.role });

      if (!permissions) {
        return res.status(403).json({
          success: false,
          error: 'No permissions found for user role'
        });
      }

      // DELETE actions are special - only allow if explicitly granted or admin
      if (action.includes('_delete') || action.includes('delete')) {
        if (permissions.action_permissions[action]) {
          return next();
        }
        return res.status(403).json({
          success: false,
          error: `Permission denied: ${action} (delete operations require explicit permission)`
        });
      }

      // Map action to page
      const actionToPageMap = {
        // Production actions (all production-related routes)
        'production_view': 'production',
        'production_create': 'production',
        'production_edit': 'production',
        'production_start': 'production',
        'production_complete': 'production',
        'machine_view': 'production',
        'machine_create': 'production',
        'machine_edit': 'production',
        
        // Product actions (all product-related routes)
        'product_view': 'products',
        'product_create': 'products',
        'product_edit': 'products',
        'individual_product_view': 'products',
        'individual_product_create': 'products',
        'individual_product_edit': 'products',
        
        // Order actions (all order-related routes)
        'order_view': 'orders',
        'order_create': 'orders',
        'order_edit': 'orders',
        'order_approve': 'orders',
        'order_deliver': 'orders',
        
        // Material actions (all material-related routes)
        'material_view': 'materials',
        'material_create': 'materials',
        'material_edit': 'materials',
        'material_restock': 'materials',
        
        // Customer/Supplier actions
        'customer_view': 'customers',
        'customer_create': 'customers',
        'customer_edit': 'customers',
        'supplier_view': 'suppliers',
        'supplier_create': 'suppliers',
        'supplier_edit': 'suppliers',
      };

      const page = actionToPageMap[action];

      // If action maps to a page, check page access
      if (page) {
        if (permissions.page_permissions[page]) {
          console.log(`✅ Allowing ${action} for user with ${page} page access`);
          return next();
        }
      }

      // SPECIAL CASE: If user has orders page access, allow access to related modules
      if (permissions.page_permissions.orders) {
        // Allow customer operations (to create/edit customers for orders)
        if (action.startsWith('customer_') && !action.includes('delete')) {
          console.log(`✅ Allowing ${action} for user with orders page access`);
          return next();
        }
        // Allow product/material/individual_product operations (to select items for orders)
        if (action.startsWith('product_') || action.startsWith('material_') || action.startsWith('individual_product_')) {
          if (!action.includes('delete')) {
            // Allow all product/material operations except delete (to select items for orders)
            console.log(`✅ Allowing ${action} for user with orders page access`);
            return next();
          }
        }
      }

      // SPECIAL CASE: If user has production page access, allow access to related modules
      if (permissions.page_permissions.production) {
        // Allow product/material/individual_product operations (to add products/materials to production)
        if (action.startsWith('product_') || action.startsWith('material_') || action.startsWith('individual_product_')) {
          if (!action.includes('delete')) {
            // Allow all product/material operations except delete
            console.log(`✅ Allowing ${action} for user with production page access`);
            return next();
          }
        }
      }

      // Fallback: Check explicit action permission (for backward compatibility)
      if (permissions.action_permissions[action]) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `Permission denied: ${action}`
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Check if user has access to a page
const checkPageAccess = (page) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Admin always has access
      if (req.user.role === 'admin') {
        return next();
      }

      // Get user's permissions
      const permissions = await Permission.findOne({ role: req.user.role });

      if (!permissions) {
        return res.status(403).json({
          success: false,
          error: 'No permissions found for user role'
        });
      }

      // Check if user has access to the page
      if (permissions.page_permissions[page]) {
        return next();
      }

      // SPECIAL CASE: If user has orders page access, allow access to related pages
      if (permissions.page_permissions.orders) {
        // Allow products, customers, materials, suppliers pages (needed for order management)
        if (page === 'products' || page === 'customers' || page === 'materials' || page === 'suppliers') {
          console.log(`✅ Allowing ${page} page access for user with orders permission`);
          return next();
        }
      }

      // SPECIAL CASE: If user has production page access, allow access to related pages
      if (permissions.page_permissions.production) {
        // Allow products, materials, and individual products pages (needed for production management)
        if (page === 'products' || page === 'materials') {
          console.log(`✅ Allowing ${page} page access for user with production permission`);
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: `Access denied to ${page} page`
      });
    } catch (error) {
      console.error('Page access check error:', error);
      res.status(500).json({
        success: false,
        error: 'Page access check failed'
      });
    }
  };
};

export {
  authenticate,
  authorize,
  checkPermission,
  checkPageAccess
};

