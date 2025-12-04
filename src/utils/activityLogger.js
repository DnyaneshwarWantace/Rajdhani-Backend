import ActivityLog from '../models/ActivityLog.js';

// Mapping of routes to actions and categories
const routeActionMap = {
  // Auth routes
  'POST /auth/login': { action: 'LOGIN', category: 'AUTH', description: 'User logged in' },
  'POST /auth/logout': { action: 'LOGOUT', category: 'AUTH', description: 'User logged out' },
  'POST /auth/change-password': { action: 'PASSWORD_CHANGE', category: 'AUTH', description: 'Changed password' },
  'POST /auth/forgot-password/request': { action: 'PASSWORD_RESET', category: 'AUTH', description: 'Requested password reset' },
  'POST /auth/forgot-password/reset': { action: 'PASSWORD_RESET', category: 'AUTH', description: 'Reset password' },
  'PUT /auth/profile': { action: 'PROFILE_UPDATE', category: 'AUTH', description: 'Updated profile' },

  // User management
  'POST /auth/admin/users': { action: 'USER_CREATE', category: 'USER', description: 'Created new user' },
  'GET /auth/admin/users': { action: 'USER_VIEW', category: 'USER', description: 'Viewed users list' },
  'PUT /users/:id': { action: 'USER_UPDATE', category: 'USER', description: 'Updated user' },
  'DELETE /auth/admin/users/:id': { action: 'USER_DELETE', category: 'USER', description: 'Deleted user' },
  'PATCH /auth/admin/users/:id/status': { action: 'USER_STATUS_CHANGE', category: 'USER', description: 'Changed user status' },
  'GET /users/:id': { action: 'USER_VIEW', category: 'USER', description: 'Viewed user details' },
  'POST /users/:id/reset-password': { action: 'PASSWORD_RESET', category: 'USER', description: 'Reset user password' },

  // Orders
  'POST /orders': { action: 'ORDER_CREATE', category: 'ORDER', description: 'Created new order' },
  'GET /orders': { action: 'ORDER_VIEW', category: 'ORDER', description: 'Viewed orders list' },
  'GET /orders/:id': { action: 'ORDER_VIEW', category: 'ORDER', description: 'Viewed order details' },
  'PUT /orders/:id': { action: 'ORDER_UPDATE', category: 'ORDER', description: 'Updated order' },
  'DELETE /orders/:id': { action: 'ORDER_DELETE', category: 'ORDER', description: 'Deleted order' },
  'PATCH /orders/:id/status': { action: 'ORDER_STATUS_CHANGE', category: 'ORDER', description: 'Changed order status' },

  // Items
  'POST /items': { action: 'ITEM_CREATE', category: 'ITEM', description: 'Created new item' },
  'GET /items': { action: 'ITEM_VIEW', category: 'ITEM', description: 'Viewed items list' },
  'GET /items/:id': { action: 'ITEM_VIEW', category: 'ITEM', description: 'Viewed item details' },
  'PUT /items/:id': { action: 'ITEM_UPDATE', category: 'ITEM', description: 'Updated item' },
  'DELETE /items/:id': { action: 'ITEM_DELETE', category: 'ITEM', description: 'Deleted item' },

  // Products
  'POST /products': { action: 'PRODUCT_CREATE', category: 'PRODUCT', description: 'Created new product' },
  'GET /products': { action: 'PRODUCT_VIEW', category: 'PRODUCT', description: 'Viewed products list' },
  'GET /products/:id': { action: 'PRODUCT_VIEW', category: 'PRODUCT', description: 'Viewed product details' },
  'PUT /products/:id': { action: 'PRODUCT_UPDATE', category: 'PRODUCT', description: 'Updated product' },
  'DELETE /products/:id': { action: 'PRODUCT_DELETE', category: 'PRODUCT', description: 'Deleted product' },

  // Clients
  'POST /clients': { action: 'CLIENT_CREATE', category: 'CLIENT', description: 'Created new client' },
  'GET /clients': { action: 'CLIENT_VIEW', category: 'CLIENT', description: 'Viewed clients list' },
  'GET /clients/:id': { action: 'CLIENT_VIEW', category: 'CLIENT', description: 'Viewed client details' },
  'PUT /clients/:id': { action: 'CLIENT_UPDATE', category: 'CLIENT', description: 'Updated client' },
  'DELETE /clients/:id': { action: 'CLIENT_DELETE', category: 'CLIENT', description: 'Deleted client' },

  // Permissions & Roles
  'GET /permissions': { action: 'PERMISSION_VIEW', category: 'PERMISSION', description: 'Viewed permissions' },
  'PUT /permissions/:id': { action: 'PERMISSION_UPDATE', category: 'PERMISSION', description: 'Updated permission' },
  'POST /roles': { action: 'ROLE_CREATE', category: 'PERMISSION', description: 'Created role' },
  'PUT /roles/:id': { action: 'ROLE_UPDATE', category: 'PERMISSION', description: 'Updated role' },
  'DELETE /roles/:id': { action: 'ROLE_DELETE', category: 'PERMISSION', description: 'Deleted role' },

  // Settings
  'GET /settings': { action: 'SETTINGS_VIEW', category: 'SETTINGS', description: 'Viewed settings' },
  'PUT /settings': { action: 'SETTINGS_UPDATE', category: 'SETTINGS', description: 'Updated settings' },

  // Activity Logs
  'GET /activity-logs': { action: 'LOGS_VIEW', category: 'OTHER', description: 'Viewed activity logs' },

  // Files
  'POST /upload': { action: 'FILE_UPLOAD', category: 'FILE', description: 'Uploaded file' },
  'DELETE /files/:id': { action: 'FILE_DELETE', category: 'FILE', description: 'Deleted file' },

  // Reports
  'GET /reports': { action: 'REPORT_GENERATE', category: 'REPORT', description: 'Generated report' },
  'POST /reports/export': { action: 'REPORT_EXPORT', category: 'REPORT', description: 'Exported report' },

  // Recipes
  'POST /recipes': { action: 'RECIPE_CREATE', category: 'RECIPE', description: 'Created recipe' },
  'GET /recipes': { action: 'RECIPE_VIEW', category: 'RECIPE', description: 'Viewed recipes list' },
  'GET /recipes/product/:product_id': { action: 'RECIPE_VIEW', category: 'RECIPE', description: 'Viewed recipe by product' },
  'PUT /recipes/:recipe_id': { action: 'RECIPE_UPDATE', category: 'RECIPE', description: 'Updated recipe' },
  'DELETE /recipes/:recipe_id': { action: 'RECIPE_DELETE', category: 'RECIPE', description: 'Deleted recipe' },
  'POST /recipes/:recipe_id/materials': { action: 'RECIPE_MATERIAL_ADD', category: 'RECIPE', description: 'Added material to recipe' },
  'DELETE /recipes/:recipe_id/materials/:material_id': { action: 'RECIPE_MATERIAL_REMOVE', category: 'RECIPE', description: 'Removed material from recipe' }
};

// Helper to match dynamic routes
function matchRoute(method, path) {
  const routeKey = `${method} ${path}`;

  // Try exact match first
  if (routeActionMap[routeKey]) {
    return routeActionMap[routeKey];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, config] of Object.entries(routeActionMap)) {
    const regex = new RegExp('^' + pattern.replace(/:\w+/g, '[^/]+') + '$');
    if (regex.test(routeKey)) {
      return config;
    }
  }

  // Default for unknown routes
  return {
    action: 'API_CALL',
    category: 'API',
    description: `${method} ${path}`
  };
}

// Main logging function
export async function createActivityLog(data) {
  try {
    const log = new ActivityLog(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
    return null;
  }
}

// Helper to extract user info from request
export function getUserInfoFromRequest(req) {
  if (!req.user) {
    return {
      user_id: 'anonymous',
      user_name: 'Anonymous',
      user_email: 'anonymous',
      user_role: 'guest'
    };
  }

  return {
    user_id: req.user.id || req.user._id,
    user_name: req.user.full_name || req.user.name || 'Unknown User',
    user_email: req.user.email || 'unknown@email.com',
    user_role: req.user.role || 'user'
  };
}

// Helper to get IP address
export function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

// Helper to create description with resource details
export function createDescription(baseDescription, resourceName, resourceType) {
  if (resourceName && resourceType) {
    return `${baseDescription}: ${resourceType} "${resourceName}"`;
  }
  if (resourceName) {
    return `${baseDescription}: "${resourceName}"`;
  }
  return baseDescription;
}

// Export route action map for reference
export { matchRoute, routeActionMap };
