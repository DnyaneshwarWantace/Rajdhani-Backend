import RawMaterial from '../models/RawMaterial.js';
import StockMovement from '../models/StockMovement.js';
import DropdownOption from '../models/DropdownOption.js';
import { generateRawMaterialId, generateId } from '../utils/idGenerator.js';
import { logMaterialCreate, logMaterialUpdate, logMaterialStockUpdate, logMaterialDelete } from '../utils/detailedLogger.js';

// Calculate material status
const calculateMaterialStatus = (currentStock, minThreshold, maxCapacity) => {
  if (currentStock <= 0) return 'out-of-stock';
  if (currentStock <= minThreshold) return 'low-stock';
  if (currentStock > maxCapacity) return 'overstock';
  return 'in-stock';
};

// Create a new raw material
export const createRawMaterial = async (req, res) => {
  try {
    const materialData = {
      ...req.body,
      id: await generateRawMaterialId()
    };

    // Validate dropdown values
    const validCategories = await DropdownOption.find({ 
      category: 'material_category', 
      is_active: true 
    }).select('value');
    const validUnits = await DropdownOption.find({ 
      category: 'material_unit', 
      is_active: true 
    }).select('value');

    const categoryValues = validCategories.map(c => c.value);
    const unitValues = validUnits.map(u => u.value);

    if (!categoryValues.includes(materialData.category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${categoryValues.join(', ')}`
      });
    }

    if (!unitValues.includes(materialData.unit)) {
      return res.status(400).json({
        success: false,
        error: `Invalid unit. Must be one of: ${unitValues.join(', ')}`
      });
    }

    // Calculate status
    const status = calculateMaterialStatus(
      materialData.current_stock,
      materialData.min_threshold,
      materialData.max_capacity
    );

    // Calculate total value
    const total_value = materialData.current_stock * materialData.cost_per_unit;

    // Set last_restocked if stock > 0
    const last_restocked = materialData.current_stock > 0 ? new Date() : null;

    const rawMaterial = new RawMaterial({
      ...materialData,
      status,
      total_value,
      last_restocked,
      created_by: req.user ? req.user.id : (materialData.created_by || 'system')
    });

    await rawMaterial.save();

    // Log material creation
    await logMaterialCreate(req, rawMaterial);

    res.status(201).json({
      success: true,
      data: rawMaterial
    });
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all raw materials with filtering
export const getRawMaterials = async (req, res) => {
  try {
    const { search, category, status, supplier_id, limit = 50, offset = 0 } = req.query;

    let query = {};

    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (supplier_id) {
      query.supplier_id = supplier_id;
    }

    const materials = await RawMaterial.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await RawMaterial.countDocuments(query);

    res.json({
      success: true,
      data: materials,
      count
    });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get raw material by ID
export const getRawMaterialById = async (req, res) => {
  try {
    // Try to find by custom id field first, then by MongoDB _id
    let material = await RawMaterial.findOne({ id: req.params.id });
    
    // If not found by custom id, try MongoDB _id
    if (!material) {
      material = await RawMaterial.findById(req.params.id);
    }

    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Raw material not found'
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Error fetching raw material:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update raw material
export const updateRawMaterial = async (req, res) => {
  try {
    const updateData = req.body;
    // Try to find by custom id field first, then by MongoDB _id
    let material = await RawMaterial.findOne({ id: req.params.id });
    
    // If not found by custom id, try MongoDB _id
    if (!material) {
      material = await RawMaterial.findById(req.params.id);
    }

    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Raw material not found'
      });
    }

    // Track changes for logging
    const changes = {};
    Object.keys(updateData).forEach(key => {
      if (material[key] !== updateData[key]) {
        changes[key] = {
          old: material[key],
          new: updateData[key]
        };
      }
    });

    // Calculate new status if stock levels changed
    const newCurrentStock = updateData.current_stock ?? material.current_stock;
    const newMinThreshold = updateData.min_threshold ?? material.min_threshold;
    const newMaxCapacity = updateData.max_capacity ?? material.max_capacity;
    const newCostPerUnit = updateData.cost_per_unit ?? material.cost_per_unit;

    const calculatedStatus = calculateMaterialStatus(newCurrentStock, newMinThreshold, newMaxCapacity);
    const newTotalValue = newCurrentStock * newCostPerUnit;

    // Update last_restocked if stock increased
    if (updateData.current_stock && updateData.current_stock > material.current_stock) {
      updateData.last_restocked = new Date();
    }

    // Preserve required fields if not provided in update
    const finalUpdateData = {
      ...updateData,
      reorder_point: updateData.reorder_point ?? material.reorder_point,
      max_capacity: updateData.max_capacity ?? material.max_capacity,
      status: updateData.status || calculatedStatus,
      total_value: newTotalValue
    };

    // Apply updates
    Object.assign(material, finalUpdateData);

    await material.save();

    // Log material update with changes
    if (Object.keys(changes).length > 0) {
      await logMaterialUpdate(req, material, changes);
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete raw material
export const deleteRawMaterial = async (req, res) => {
  try {
    // Try to find by custom id field first, then by MongoDB _id
    let material = await RawMaterial.findOne({ id: req.params.id });
    
    // If not found by custom id, try MongoDB _id
    if (!material) {
      material = await RawMaterial.findById(req.params.id);
    }

    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Raw material not found'
      });
    }

    // Delete using the found material's _id (MongoDB)
    await RawMaterial.findByIdAndDelete(material._id);

    // Log material deletion
    await logMaterialDelete(req, material);

    res.json({
      success: true,
      message: 'Raw material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get inventory statistics
export const getInventoryStats = async (req, res) => {
  try {
    const materials = await RawMaterial.find({});

    const stats = materials.reduce((acc, material) => {
      acc.totalMaterials++;
      if (material.status === 'in-stock') acc.inStock++;
      if (material.status === 'low-stock') acc.lowStock++;
      if (material.status === 'out-of-stock') acc.outOfStock++;
      if (material.status === 'overstock') acc.overstock++;
      acc.totalValue += material.total_value || 0;
      return acc;
    }, {
      totalMaterials: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      overstock: 0,
      totalValue: 0
    });

    stats.averageValue = stats.totalMaterials > 0 ? stats.totalValue / stats.totalMaterials : 0;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get materials requiring reorder
export const getMaterialsRequiringReorder = async (req, res) => {
  try {
    const materials = await RawMaterial.find({
      $expr: { $lte: ['$current_stock', '$reorder_point'] }
    }).sort({ current_stock: 1 });

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    console.error('Error fetching materials requiring reorder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Adjust stock for a material
export const adjustStock = async (req, res) => {
  try {
    const { quantity, reason, operator, notes } = req.body;
    // Try to find by custom id field first, then by MongoDB _id
    let material = await RawMaterial.findOne({ id: req.params.id });
    
    // If not found by custom id, try MongoDB _id
    if (!material) {
      material = await RawMaterial.findById(req.params.id);
    }

    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Raw material not found'
      });
    }

    const previousStock = material.current_stock;
    const newStock = previousStock + quantity;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock for adjustment'
      });
    }

    // Update material stock
    material.current_stock = newStock;
    if (quantity > 0) {
      material.last_restocked = new Date();
    }
    
    // Recalculate status
    material.status = calculateMaterialStatus(
      newStock,
      material.min_threshold,
      material.max_capacity
    );
    
    // Recalculate total value
    material.total_value = newStock * material.cost_per_unit;
    
    await material.save();

    // Record stock movement
    const stockMovement = new StockMovement({
      id: await generateId('SM'),
      material_id: material.id,
      material_name: material.name,
      movement_type: quantity > 0 ? 'in' : 'out',
      quantity: Math.abs(quantity),
      unit: material.unit,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: reason || 'adjustment',
      reference_type: 'adjustment',
      cost_per_unit: material.cost_per_unit,
      total_cost: Math.abs(quantity) * material.cost_per_unit,
      operator,
      notes
    });
    await stockMovement.save();

    // Log stock adjustment
    await logMaterialStockUpdate(req, material, previousStock, newStock, reason || 'Stock adjustment');

    res.json({
      success: true,
      data: material,
      stock_movement: stockMovement
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get stock movement history for a material
export const getStockHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const movements = await StockMovement.find({ material_id: req.params.id })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await StockMovement.countDocuments({ material_id: req.params.id });

    res.json({
      success: true,
      data: movements,
      count
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get stock status overview
export const getStockStatus = async (req, res) => {
  try {
    const materials = await RawMaterial.find({});

    const statusCounts = materials.reduce((acc, material) => {
      acc.total++;
      acc[material.status]++;
      acc.total_value += material.total_value || 0;
      return acc;
    }, {
      total: 0,
      'in-stock': 0,
      'low-stock': 0,
      'out-of-stock': 0,
      'overstock': 0,
      'in-transit': 0,
      total_value: 0
    });

    res.json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Error fetching stock status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get dropdown data for raw material creation
export const getMaterialDropdownData = async (req, res) => {
  try {
    const categories = await DropdownOption.find({ 
      category: 'material_category', 
      is_active: true 
    }).sort({ display_order: 1 });

    const units = await DropdownOption.find({ 
      category: 'material_unit', 
      is_active: true 
    }).sort({ display_order: 1 });

    res.json({
      success: true,
      data: {
        categories: categories.map(c => ({ value: c.value, label: c.value })),
        units: units.map(u => ({ value: u.value, label: u.value }))
      }
    });
  } catch (error) {
    console.error('Error fetching material dropdown data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
