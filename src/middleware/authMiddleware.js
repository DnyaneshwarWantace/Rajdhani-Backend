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
// Simplified: All authenticated users have permission for all actions (except settings/activity-logs which are handled by checkPageAccess)
const checkPermission = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // All authenticated users have permission for all actions
      // Settings and activity-logs are already restricted by checkPageAccess
      return next();
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
// Simplified: All authenticated users have access to all pages except 'settings' and 'activity-logs' (admin only)
const checkPageAccess = (page) => {
  return async (req, res, next) => {
    try {
      console.log(`🔍 checkPageAccess called for page: ${page}, path: ${req.path}`);

      if (!req.user) {
        console.log(`❌ No user found for ${page} page`);
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log(`👤 User: ${req.user.email}, Role: ${req.user.role}, Checking page: ${page}`);

      // Only restrict 'settings' and 'activity-logs' pages to admin
      // All other pages (customers, suppliers, products, orders, materials, production, etc.) are accessible to all authenticated users
      const restrictedPages = ['settings', 'activity-logs'];
      
      if (restrictedPages.includes(page)) {
        if (req.user.role !== 'admin') {
          console.log(`❌ Access denied: ${req.user.email} (${req.user.role}) tried to access ${page} page`);
          return res.status(403).json({
            success: false,
            error: `Access denied to ${page} page. Admin access required.`
          });
        }
      }

      // All other pages are accessible to all authenticated users
      // This includes: customers, suppliers, products, orders, materials, production, etc.
      console.log(`✅ Allowing access: ${req.user.email} (${req.user.role}) accessing ${page} page`);
      return next();
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

