import ActivityLog from '../models/ActivityLog.js';

// Socket.IO instance will be injected
let ioInstance = null;

export const setSocketIO = (io) => {
  ioInstance = io;
};

// Helper to get user info from request
const getUserInfo = (req) => {
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
};

// Helper to get IP address
const getIpAddress = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
};

/**
 * Log detailed activity
 * @param {Object} req - Express request object
 * @param {Object} details - Activity details
 * @param {string} details.action - Action type (e.g., 'PRODUCT_CREATE')
 * @param {string} details.category - Category (e.g., 'PRODUCT')
 * @param {string} details.description - Human-readable description
 * @param {Object} details.metadata - Additional metadata
 * @param {number} details.statusCode - HTTP status code
 */
export const logActivity = async (req, details) => {
  try {
    const userInfo = getUserInfo(req);

    const logData = {
      ...userInfo,
      action: details.action,
      action_category: details.category,
      description: details.description,
      method: req.method,
      endpoint: req.path,
      ip_address: getIpAddress(req),
      user_agent: req.headers['user-agent'] || 'unknown',
      status_code: details.statusCode || 200,
      response_time: details.responseTime || 0,
      target_resource: details.resourceId,
      target_resource_type: details.resourceType,
      changes: details.changes,
      metadata: details.metadata,
      created_at: new Date()
    };

    const log = new ActivityLog(logData);
    await log.save();

    // Emit to Socket.IO for real-time updates
    if (ioInstance) {
      ioInstance.to('admin-logs').emit('new-activity', {
        _id: log._id,
        user_name: log.user_name,
        user_email: log.user_email,
        user_role: log.user_role,
        action: log.action,
        action_category: log.action_category,
        description: log.description,
        method: log.method,
        endpoint: log.endpoint,
        status_code: log.status_code,
        response_time: log.response_time,
        target_resource: log.target_resource,
        target_resource_type: log.target_resource_type,
        changes: log.changes,
        metadata: log.metadata,
        created_at: log.created_at,
        ip_address: log.ip_address
      });
    }

    return log;
  } catch (error) {
    console.error('❌ Error logging activity:', error);
    return null;
  }
};

// Product-specific loggers
export const logProductCreate = async (req, product) => {
  // Build detailed description with product information
  const productDetails = [];
  
  // Basic info
  if (product.category) productDetails.push(`Category: ${product.category}`);
  if (product.subcategory) productDetails.push(`Subcategory: ${product.subcategory}`);
  if (product.color) productDetails.push(`Color: ${product.color}`);
  if (product.pattern) productDetails.push(`Pattern: ${product.pattern}`);
  
  // Dimensions
  if (product.length && product.length_unit) {
    productDetails.push(`Length: ${product.length} ${product.length_unit}`);
  }
  if (product.width && product.width_unit) {
    productDetails.push(`Width: ${product.width} ${product.width_unit}`);
  }
  if (product.weight && product.weight_unit) {
    productDetails.push(`Weight: ${product.weight} ${product.weight_unit}`);
  }
  
  // Stock info
  if (product.base_quantity !== undefined) {
    productDetails.push(`Quantity: ${product.base_quantity}`);
  }
  if (product.unit) {
    productDetails.push(`Unit: ${product.unit}`);
  }
  
  // Recipe info
  if (product.recipe && product.recipe.length > 0) {
    productDetails.push(`Recipe: ${product.recipe.length} material(s)`);
  } else {
    productDetails.push(`Recipe: None`);
  }
  
  // Build description
  const productId = product.id || 'N/A';
  const detailsText = productDetails.length > 0 ? ` - ${productDetails.join(', ')}` : '';
  const description = `Created product "${product.name}" (${productId})${detailsText}`;

  return logActivity(req, {
    action: 'PRODUCT_CREATE',
    category: 'PRODUCT',
    description,
    resourceId: productId,
    resourceType: 'Product',
    metadata: {
      product_name: product.name,
      product_id: productId,
      category: product.category || null,
      subcategory: product.subcategory || null,
      color: product.color || null,
      pattern: product.pattern || null,
      length: product.length || null,
      length_unit: product.length_unit || null,
      width: product.width || null,
      width_unit: product.width_unit || null,
      weight: product.weight || null,
      weight_unit: product.weight_unit || null,
      base_quantity: product.base_quantity !== undefined ? product.base_quantity : 0,
      unit: product.unit || null,
      has_recipe: !!product.recipe,
      recipe_count: product.recipe?.length || 0,
      individual_stock_tracking: product.individual_stock_tracking || false
    }
  });
};

export const logProductUpdate = async (req, product, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated product "${product.name}" (${product.product_id}): ${changedFields}`;

  return logActivity(req, {
    action: 'PRODUCT_UPDATE',
    category: 'PRODUCT',
    description,
    resourceId: product.product_id,
    resourceType: 'Product',
    changes,
    metadata: {
      product_name: product.name,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logProductDelete = async (req, product) => {
  const description = `Deleted product "${product.name}" (${product.product_id})`;

  return logActivity(req, {
    action: 'PRODUCT_DELETE',
    category: 'PRODUCT',
    description,
    resourceId: product.product_id,
    resourceType: 'Product',
    metadata: {
      product_name: product.name
    }
  });
};

export const logIndividualProductGenerate = async (req, product, quantity) => {
  const description = `Generated ${quantity} individual products for "${product.name}" (${product.product_id})`;

  return logActivity(req, {
    action: 'ITEM_CREATE',
    category: 'ITEM',
    description,
    resourceId: product.product_id,
    resourceType: 'Product',
    metadata: {
      product_name: product.name,
      quantity_generated: quantity
    }
  });
};

// Production-specific loggers
export const logProductionStart = async (req, production) => {
  const description = `Started production batch ${production.batch_number} for order ${production.order_id}`;

  return logActivity(req, {
    action: 'PRODUCTION_CREATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      order_id: production.order_id,
      status: production.status
    }
  });
};

export const logProductionRecipeAdd = async (req, production, recipe) => {
  const description = `Added recipe to production batch ${production.batch_number} with ${recipe.materials?.length || 0} materials`;

  return logActivity(req, {
    action: 'PRODUCTION_UPDATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      material_count: recipe.materials?.length || 0,
      step: 'recipe_added'
    }
  });
};

export const logProductionMachineAssign = async (req, production, machineId) => {
  const description = `Assigned machine to production batch ${production.batch_number} (Machine ID: ${machineId})`;

  return logActivity(req, {
    action: 'PRODUCTION_UPDATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      machine_id: machineId,
      step: 'machine_assigned'
    }
  });
};

export const logProductionStepComplete = async (req, production, stepName) => {
  const description = `Completed ${stepName} step for production batch ${production.batch_number}`;

  return logActivity(req, {
    action: 'PRODUCTION_UPDATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      step_completed: stepName,
      current_status: production.status
    }
  });
};

export const logProductionWastageAdd = async (req, production, wastageData) => {
  const description = `Added wastage entry for production batch ${production.batch_number}: ${wastageData.waste_type} (${wastageData.quantity} ${wastageData.unit})`;

  return logActivity(req, {
    action: 'PRODUCTION_UPDATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      waste_type: wastageData.waste_type,
      quantity: wastageData.quantity,
      unit: wastageData.unit,
      step: 'wastage_added'
    }
  });
};

export const logProductionWastageSkip = async (req, production) => {
  const description = `Skipped wastage step for production batch ${production.batch_number}`;

  return logActivity(req, {
    action: 'PRODUCTION_UPDATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      step: 'wastage_skipped'
    }
  });
};

export const logProductionComplete = async (req, production) => {
  const description = `Completed production batch ${production.batch_number}`;

  return logActivity(req, {
    action: 'PRODUCTION_UPDATE',
    category: 'PRODUCTION',
    description,
    resourceId: production.batch_number,
    resourceType: 'Production',
    metadata: {
      batch_number: production.batch_number,
      final_status: 'completed'
    }
  });
};

// Order-specific loggers
export const logOrderCreate = async (req, order) => {
  const description = `Created order ${order.order_number} for customer ${order.customer_name} with ${order.items?.length || 0} items`;

  return logActivity(req, {
    action: 'ORDER_CREATE',
    category: 'ORDER',
    description,
    resourceId: order.order_number,
    resourceType: 'Order',
    metadata: {
      order_number: order.order_number,
      customer_name: order.customer_name,
      item_count: order.items?.length || 0,
      total_amount: order.total_amount
    }
  });
};

export const logOrderUpdate = async (req, order, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated order ${order.order_number}: ${changedFields}`;

  return logActivity(req, {
    action: 'ORDER_UPDATE',
    category: 'ORDER',
    description,
    resourceId: order.order_number,
    resourceType: 'Order',
    changes,
    metadata: {
      order_number: order.order_number,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logOrderStatusChange = async (req, order, oldStatus, newStatus) => {
  const description = `Changed order ${order.order_number} status from "${oldStatus}" to "${newStatus}"`;

  return logActivity(req, {
    action: 'ORDER_STATUS_CHANGE',
    category: 'ORDER',
    description,
    resourceId: order.order_number,
    resourceType: 'Order',
    changes: {
      old_status: oldStatus,
      new_status: newStatus
    },
    metadata: {
      order_number: order.order_number,
      old_status: oldStatus,
      new_status: newStatus
    }
  });
};

export const logOrderDelete = async (req, order) => {
  const description = `Deleted order ${order.order_number} (Customer: ${order.customer_name})`;

  return logActivity(req, {
    action: 'ORDER_DELETE',
    category: 'ORDER',
    description,
    resourceId: order.order_number,
    resourceType: 'Order',
    metadata: {
      order_number: order.order_number,
      customer_name: order.customer_name
    }
  });
};

// Raw Material loggers
export const logMaterialCreate = async (req, material) => {
  const description = `Added raw material "${material.name}" (${material.material_id}) - Type: ${material.material_type}`;

  return logActivity(req, {
    action: 'MATERIAL_CREATE',
    category: 'MATERIAL',
    description,
    resourceId: material.material_id,
    resourceType: 'RawMaterial',
    metadata: {
      material_name: material.name,
      material_type: material.material_type,
      initial_stock: material.current_stock
    }
  });
};

export const logMaterialUpdate = async (req, material, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated raw material "${material.name}": ${changedFields}`;

  return logActivity(req, {
    action: 'MATERIAL_UPDATE',
    category: 'MATERIAL',
    description,
    resourceId: material.material_id,
    resourceType: 'RawMaterial',
    changes,
    metadata: {
      material_name: material.name,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logMaterialStockUpdate = async (req, material, oldStock, newStock, reason) => {
  const diff = newStock - oldStock;
  const action = diff > 0 ? 'increased' : 'decreased';
  const description = `Stock ${action} for "${material.name}" from ${oldStock} to ${newStock} (${reason})`;

  return logActivity(req, {
    action: 'MATERIAL_UPDATE',
    category: 'MATERIAL',
    description,
    resourceId: material.material_id,
    resourceType: 'RawMaterial',
    changes: {
      old_stock: oldStock,
      new_stock: newStock,
      difference: diff
    },
    metadata: {
      material_name: material.name,
      old_stock: oldStock,
      new_stock: newStock,
      difference: diff,
      reason
    }
  });
};

// Purchase Order loggers
export const logPurchaseOrderCreate = async (req, order) => {
  const description = `Created purchase order ${order.order_number} for supplier ${order.supplier_name} with total amount ${order.total_amount}`;

  return logActivity(req, {
    action: 'PURCHASE_ORDER_CREATE',
    category: 'PURCHASE_ORDER',
    description,
    resourceId: order.order_number || order.id,
    resourceType: 'PurchaseOrder',
    metadata: {
      order_number: order.order_number,
      order_id: order.id,
      supplier_name: order.supplier_name,
      supplier_id: order.supplier_id,
      total_amount: order.total_amount,
      status: order.status
    }
  });
};

export const logPurchaseOrderStatusChange = async (req, order, oldStatus, newStatus) => {
  const description = `Changed purchase order ${order.order_number} status from "${oldStatus}" to "${newStatus}"`;

  return logActivity(req, {
    action: 'PURCHASE_ORDER_STATUS_CHANGE',
    category: 'PURCHASE_ORDER',
    description,
    resourceId: order.order_number || order.id,
    resourceType: 'PurchaseOrder',
    changes: {
      old_status: oldStatus,
      new_status: newStatus
    },
    metadata: {
      order_number: order.order_number,
      order_id: order.id,
      supplier_name: order.supplier_name,
      old_status: oldStatus,
      new_status: newStatus
    }
  });
};

export const logPurchaseOrderUpdate = async (req, order, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated purchase order ${order.order_number}: ${changedFields}`;

  return logActivity(req, {
    action: 'PURCHASE_ORDER_UPDATE',
    category: 'PURCHASE_ORDER',
    description,
    resourceId: order.order_number || order.id,
    resourceType: 'PurchaseOrder',
    changes,
    metadata: {
      order_number: order.order_number,
      order_id: order.id,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logPurchaseOrderDelete = async (req, order) => {
  const description = `Deleted purchase order ${order.order_number} (Supplier: ${order.supplier_name})`;

  return logActivity(req, {
    action: 'PURCHASE_ORDER_DELETE',
    category: 'PURCHASE_ORDER',
    description,
    resourceId: order.order_number || order.id,
    resourceType: 'PurchaseOrder',
    metadata: {
      order_number: order.order_number,
      order_id: order.id,
      supplier_name: order.supplier_name
    }
  });
};

export const logMaterialDelete = async (req, material) => {
  const description = `Deleted raw material "${material.name}" (${material.material_id})`;

  return logActivity(req, {
    action: 'MATERIAL_DELETE',
    category: 'MATERIAL',
    description,
    resourceId: material.material_id,
    resourceType: 'RawMaterial',
    metadata: {
      material_name: material.name,
      material_type: material.material_type
    }
  });
};

// Recipe-specific loggers for product recipes
export const logProductRecipeCreate = async (req, product, recipe, materialCount) => {
  const description = `Added recipe to product "${product.name}" (${product.id}) with ${materialCount} materials`;

  return logActivity(req, {
    action: 'PRODUCT_UPDATE',
    category: 'PRODUCT',
    description,
    resourceId: product.id,
    resourceType: 'Product',
    metadata: {
      product_name: product.name,
      recipe_id: recipe.id,
      material_count: materialCount,
      has_recipe: true
    }
  });
};

export const logProductRecipeUpdate = async (req, product, recipe, materialCount) => {
  const description = `Updated recipe for product "${product.name}" (${product.id}) - now has ${materialCount} materials`;

  return logActivity(req, {
    action: 'RECIPE_UPDATE',
    category: 'RECIPE',
    description,
    resourceId: recipe.id,
    resourceType: 'Recipe',
    target_resource: product.id,
    target_resource_type: 'Product',
    metadata: {
      product_name: product.name,
      product_id: product.id,
      recipe_id: recipe.id,
      material_count: materialCount,
      updated_recipe: true
    }
  });
};

// Log recipe creation (standalone, not tied to product update)
export const logRecipeCreate = async (req, product, recipe, materialCount) => {
  const description = `Created recipe for product "${product.name}" (${product.id}) with ${materialCount} materials`;

  return logActivity(req, {
    action: 'RECIPE_CREATE',
    category: 'RECIPE',
    description,
    resourceId: recipe.id,
    resourceType: 'Recipe',
    target_resource: product.id,
    target_resource_type: 'Product',
    metadata: {
      product_name: product.name,
      product_id: product.id,
      recipe_id: recipe.id,
      material_count: materialCount,
      recipe_version: recipe.version,
      base_unit: recipe.base_unit
    }
  });
};

// Log recipe deletion
export const logRecipeDelete = async (req, product, recipe) => {
  const description = `Deleted recipe for product "${product.name}" (${product.id})`;

  return logActivity(req, {
    action: 'RECIPE_DELETE',
    category: 'RECIPE',
    description,
    resourceId: recipe.id,
    resourceType: 'Recipe',
    target_resource: product.id,
    target_resource_type: 'Product',
    metadata: {
      product_name: product.name,
      product_id: product.id,
      recipe_id: recipe.id
    }
  });
};

// Log material added to recipe
export const logRecipeMaterialAdd = async (req, product, recipe, material) => {
  const description = `Added "${material.material_name}" to recipe for product "${product.name}" (${product.id})`;

  return logActivity(req, {
    action: 'RECIPE_MATERIAL_ADD',
    category: 'RECIPE',
    description,
    resourceId: recipe.id,
    resourceType: 'Recipe',
    target_resource: product.id,
    target_resource_type: 'Product',
    metadata: {
      product_name: product.name,
      product_id: product.id,
      recipe_id: recipe.id,
      material_id: material.material_id,
      material_name: material.material_name,
      material_type: material.material_type,
      quantity_per_sqm: material.quantity_per_sqm,
      unit: material.unit
    }
  });
};

// Log material removed from recipe
export const logRecipeMaterialRemove = async (req, product, recipe, material) => {
  const description = `Removed "${material.material_name}" from recipe for product "${product.name}" (${product.id})`;

  return logActivity(req, {
    action: 'RECIPE_MATERIAL_REMOVE',
    category: 'RECIPE',
    description,
    resourceId: recipe.id,
    resourceType: 'Recipe',
    target_resource: product.id,
    target_resource_type: 'Product',
    metadata: {
      product_name: product.name,
      product_id: product.id,
      recipe_id: recipe.id,
      material_id: material.material_id,
      material_name: material.material_name,
      material_type: material.material_type
    }
  });
};

// Dropdown Master loggers
export const logDropdownCreate = async (req, dropdownOption) => {
  const description = `Added dropdown option "${dropdownOption.value}" to category "${dropdownOption.category}"`;

  return logActivity(req, {
    action: 'SETTINGS_UPDATE',
    category: 'SETTINGS',
    description,
    resourceId: dropdownOption.id,
    resourceType: 'DropdownOption',
    metadata: {
      category: dropdownOption.category,
      value: dropdownOption.value,
      display_order: dropdownOption.display_order
    }
  });
};

export const logDropdownUpdate = async (req, dropdownOption, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated dropdown option "${dropdownOption.value}" in category "${dropdownOption.category}": ${changedFields}`;

  return logActivity(req, {
    action: 'SETTINGS_UPDATE',
    category: 'SETTINGS',
    description,
    resourceId: dropdownOption.id,
    resourceType: 'DropdownOption',
    changes,
    metadata: {
      category: dropdownOption.category,
      value: dropdownOption.value,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logDropdownDelete = async (req, dropdownOption) => {
  const description = `Deleted dropdown option "${dropdownOption.value}" from category "${dropdownOption.category}"`;

  return logActivity(req, {
    action: 'SETTINGS_UPDATE',
    category: 'SETTINGS',
    description,
    resourceId: dropdownOption.id,
    resourceType: 'DropdownOption',
    metadata: {
      category: dropdownOption.category,
      value: dropdownOption.value
    }
  });
};

// Individual Product loggers (more detailed)
export const logIndividualProductAdd = async (req, individualProduct, product) => {
  const description = `Added individual product "${individualProduct.id}" for product "${product.name}" (${product.id}) - Status: ${individualProduct.status}`;

  return logActivity(req, {
    action: 'ITEM_CREATE',
    category: 'ITEM',
    description,
    resourceId: individualProduct.id,
    resourceType: 'IndividualProduct',
    metadata: {
      product_id: product.id,
      product_name: product.name,
      individual_product_id: individualProduct.id,
      status: individualProduct.status,
      batch_number: individualProduct.batch_number,
      quality_grade: individualProduct.quality_grade
    }
  });
};

// Supplier loggers
export const logSupplierCreate = async (req, supplier) => {
  const description = `Created supplier "${supplier.name}" (${supplier.id})`;
  
  return logActivity(req, {
    action: 'SUPPLIER_CREATE',
    category: 'SUPPLIER',
    description,
    resourceId: supplier.id,
    resourceType: 'Supplier',
    metadata: {
      supplier_name: supplier.name,
      supplier_id: supplier.id,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      status: supplier.status
    }
  });
};

export const logSupplierUpdate = async (req, supplier, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated supplier "${supplier.name}" (${supplier.id}): ${changedFields}`;
  
  return logActivity(req, {
    action: 'SUPPLIER_UPDATE',
    category: 'SUPPLIER',
    description,
    resourceId: supplier.id,
    resourceType: 'Supplier',
    changes,
    metadata: {
      supplier_name: supplier.name,
      supplier_id: supplier.id,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logSupplierDelete = async (req, supplier) => {
  const description = `Deleted supplier "${supplier.name}" (${supplier.id})`;
  
  return logActivity(req, {
    action: 'SUPPLIER_DELETE',
    category: 'SUPPLIER',
    description,
    resourceId: supplier.id,
    resourceType: 'Supplier',
    metadata: {
      supplier_name: supplier.name,
      supplier_id: supplier.id,
      contact_person: supplier.contact_person
    }
  });
};

// Customer loggers
export const logCustomerCreate = async (req, customer) => {
  const description = `Created customer "${customer.name}" (${customer.id})`;
  
  return logActivity(req, {
    action: 'CUSTOMER_CREATE',
    category: 'CUSTOMER',
    description,
    resourceId: customer.id,
    resourceType: 'Customer',
    metadata: {
      customer_name: customer.name,
      customer_id: customer.id,
      email: customer.email,
      phone: customer.phone,
      customer_type: customer.customer_type,
      status: customer.status,
      company_name: customer.company_name
    }
  });
};

export const logCustomerUpdate = async (req, customer, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated customer "${customer.name}" (${customer.id}): ${changedFields}`;
  
  return logActivity(req, {
    action: 'CUSTOMER_UPDATE',
    category: 'CUSTOMER',
    description,
    resourceId: customer.id,
    resourceType: 'Customer',
    changes,
    metadata: {
      customer_name: customer.name,
      customer_id: customer.id,
      fields_changed: Object.keys(changes)
    }
  });
};

export const logCustomerDelete = async (req, customer) => {
  const description = `Deleted customer "${customer.name}" (${customer.id})`;
  
  return logActivity(req, {
    action: 'CUSTOMER_DELETE',
    category: 'CUSTOMER',
    description,
    resourceId: customer.id,
    resourceType: 'Customer',
    metadata: {
      customer_name: customer.name,
      customer_id: customer.id,
      email: customer.email,
      company_name: customer.company_name
    }
  });
};

export const logIndividualProductUpdate = async (req, individualProduct, changes) => {
  const changedFields = Object.keys(changes).join(', ');
  const description = `Updated individual product "${individualProduct.id}": ${changedFields}`;

  return logActivity(req, {
    action: 'ITEM_UPDATE',
    category: 'ITEM',
    description,
    resourceId: individualProduct.id,
    resourceType: 'IndividualProduct',
    changes,
    metadata: {
      individual_product_id: individualProduct.id,
      product_id: individualProduct.product_id,
      fields_changed: Object.keys(changes)
    }
  });
};
