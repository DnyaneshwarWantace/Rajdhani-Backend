import MaterialConsumption from '../models/MaterialConsumption.js';
import { generateId } from '../utils/idGenerator.js';
import Product from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';
import IndividualProduct from '../models/IndividualProduct.js';

// Get all material consumption records
const getAllMaterialConsumption = async (req, res) => {
  try {
    const {
      production_batch_id,
      production_flow_id,
      material_type,
      material_id,
      step_id,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    // Use production_batch_id consistently (batch ID is the source of truth)
    // Check both production_batch_id and production_product_id for backward compatibility
    const filter = {};
    
    if (production_batch_id) {
      // Check both fields for backward compatibility (old records may have production_product_id)
      filter.$or = [
        { production_batch_id: production_batch_id },
        { production_product_id: production_batch_id }
      ];
    }
    if (production_flow_id) filter.production_flow_id = production_flow_id;
    if (material_type) filter.material_type = material_type;
    if (material_id) filter.material_id = material_id;
    if (step_id) filter.step_id = step_id;
    
    if (start_date || end_date) {
      filter.consumed_at = {};
      if (start_date) filter.consumed_at.$gte = new Date(start_date);
      if (end_date) filter.consumed_at.$lte = new Date(end_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [consumption, total] = await Promise.all([
      MaterialConsumption.find(filter)
        .sort({ consumed_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MaterialConsumption.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: consumption,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching material consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch material consumption records'
    });
  }
};

// Get material consumption by ID
const getMaterialConsumptionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const consumption = await MaterialConsumption.findOne({ id, status: 'active' });
    
    if (!consumption) {
      return res.status(404).json({
        success: false,
        error: 'Material consumption record not found'
      });
    }

    res.json({
      success: true,
      data: consumption
    });
  } catch (error) {
    console.error('Error fetching material consumption by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch material consumption record'
    });
  }
};

// Create new material consumption record
const createMaterialConsumption = async (req, res) => {
  try {
    const {
      production_batch_id,
      production_flow_id,
      material_id,
      material_name,
      material_type,
      quantity_used,
      unit,
      operator,
      machine_id,
      machine_name,
      step_id,
      step_name,
      individual_product_ids = [],
      waste_quantity = 0,
      waste_type = 'normal',
      notes
    } = req.body;

    // Validate required fields
    if (!production_batch_id || !material_id || !material_name || !material_type || !quantity_used || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: production_batch_id, material_id, material_name, material_type, quantity_used, unit'
      });
    }

    // Validate material type
    if (!['product', 'raw_material'].includes(material_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid material_type. Must be "product" or "raw_material"'
      });
    }

    // Check if material exists and get current stock
    let materialExists = false;
    let currentStock = 0;
    
    if (material_type === 'product') {
      const product = await Product.findOne({ id: material_id });
      if (product) {
        materialExists = true;
        currentStock = product.base_quantity || 0;
      }
    } else if (material_type === 'raw_material') {
      const rawMaterial = await RawMaterial.findOne({ id: material_id });
      if (rawMaterial) {
        materialExists = true;
        currentStock = rawMaterial.current_stock || 0;
      }
    }

    if (!materialExists) {
      return res.status(404).json({
        success: false,
        error: `Material not found: ${material_name} (${material_id})`
      });
    }

    // Check if sufficient stock is available
    if (currentStock < quantity_used) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Available: ${currentStock}, Required: ${quantity_used}`
      });
    }

    // Calculate quantities
    const qtyUsed = parseFloat(quantity_used);

    // Generate unique ID using timestamp + random to avoid duplicates
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const uniqueId = `MATCONS-${timestamp}-${randomStr}`;
    
    // Create material consumption record
    // Use production_batch_id consistently (batch ID is the source of truth)
    const consumptionData = {
      id: uniqueId,
      production_batch_id, // Batch ID is the primary identifier
      // Provide production_product_id for backward/alternate schema compatibility
      production_product_id: req.body.production_product_id || production_batch_id,
      production_flow_id, // Optional flow ID for tracking
      material_id,
      material_name,
      material_type,
      quantity_used: qtyUsed,
      unit,
      operator,
      machine_id,
      machine_name,
      step_id,
      step_name,
      individual_product_ids,
      waste_quantity: parseFloat(waste_quantity) || 0,
      waste_type: waste_type || 'normal',
      notes,
      consumed_at: new Date()
    };

    const consumption = new MaterialConsumption(consumptionData);
    await consumption.save();

    // Conditionally update material stock
    const deductNow = req.body && Object.prototype.hasOwnProperty.call(req.body, 'deduct_now') ? Boolean(req.body.deduct_now) : true;
    if (deductNow) {
      if (material_type === 'product') {
        await Product.findOneAndUpdate(
          { id: material_id },
          { 
            $inc: { base_quantity: -quantity_used },
            $set: { updated_at: new Date() }
          }
        );
      } else if (material_type === 'raw_material') {
        await RawMaterial.findOneAndUpdate(
          { id: material_id },
          { 
            $inc: { current_stock: -quantity_used },
            $set: { updated_at: new Date() }
          }
        );
      }
    }

    // Update individual product status if individual products are specified
    if (individual_product_ids && individual_product_ids.length > 0) {
      await IndividualProduct.updateMany(
        { id: { $in: individual_product_ids } },
        { 
          $set: { 
            status: 'consumed',
            consumed_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    }

    res.status(201).json({
      success: true,
      data: consumption,
      message: 'Material consumption recorded successfully'
    });
  } catch (error) {
    console.error('Error creating material consumption:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create material consumption record',
      details: error.stack
    });
  }
};

// Update material consumption record
const updateMaterialConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;
    updateData.updated_at = new Date();

    const consumption = await MaterialConsumption.findOneAndUpdate(
      { id, status: 'active' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!consumption) {
      return res.status(404).json({
        success: false,
        error: 'Material consumption record not found'
      });
    }

    res.json({
      success: true,
      data: consumption,
      message: 'Material consumption updated successfully'
    });
  } catch (error) {
    console.error('Error updating material consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update material consumption record'
    });
  }
};

// Delete material consumption record (soft delete)
const deleteMaterialConsumption = async (req, res) => {
  try {
    const { id } = req.params;

    const consumption = await MaterialConsumption.findOneAndUpdate(
      { id, status: 'active' },
      { 
        status: 'cancelled',
        updated_at: new Date()
      },
      { new: true }
    );

    if (!consumption) {
      return res.status(404).json({
        success: false,
        error: 'Material consumption record not found'
      });
    }

    // Restore material stock
    if (consumption.material_type === 'product') {
      await Product.findOneAndUpdate(
        { id: consumption.material_id },
        { 
          $inc: { base_quantity: consumption.quantity_used },
          $set: { updated_at: new Date() }
        }
      );
    } else if (consumption.material_type === 'raw_material') {
      await RawMaterial.findOneAndUpdate(
        { id: consumption.material_id },
        { 
          $inc: { current_stock: consumption.quantity_used },
          $set: { updated_at: new Date() }
        }
      );
    }

    // Restore individual product status if applicable
    if (consumption.individual_product_ids && consumption.individual_product_ids.length > 0) {
      await IndividualProduct.updateMany(
        { id: { $in: consumption.individual_product_ids } },
        { 
          $set: { 
            status: 'available',
            consumed_at: null,
            updated_at: new Date()
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Material consumption record cancelled successfully'
    });
  } catch (error) {
    console.error('Error deleting material consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete material consumption record'
    });
  }
};

// Get consumption summary for a production batch
const getBatchConsumptionSummary = async (req, res) => {
  try {
    const { batchId } = req.params;

    const summary = await MaterialConsumption.getBatchSummary(batchId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching batch consumption summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch consumption summary'
    });
  }
};

// Get consumption by material type
const getConsumptionByMaterialType = async (req, res) => {
  try {
    const { batchId, materialType } = req.params;

    if (!['product', 'raw_material'].includes(materialType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid material type. Must be "product" or "raw_material"'
      });
    }

    const consumption = await MaterialConsumption.getConsumptionByType(batchId, materialType);

    res.json({
      success: true,
      data: consumption
    });
  } catch (error) {
    console.error('Error fetching consumption by material type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consumption by material type'
    });
  }
};

// Get consumption for a specific step
const getStepConsumption = async (req, res) => {
  try {
    const { stepId } = req.params;

    const consumption = await MaterialConsumption.getStepConsumption(stepId);

    res.json({
      success: true,
      data: consumption
    });
  } catch (error) {
    console.error('Error fetching step consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch step consumption'
    });
  }
};

// Get consumption analytics
const getConsumptionAnalytics = async (req, res) => {
  try {
    const {
      production_batch_id,
      start_date,
      end_date,
      material_type
    } = req.query;

    const filter = { status: 'active' };
    
    if (production_batch_id) filter.production_batch_id = production_batch_id;
    if (material_type) filter.material_type = material_type;
    
    if (start_date || end_date) {
      filter.consumed_at = {};
      if (start_date) filter.consumed_at.$gte = new Date(start_date);
      if (end_date) filter.consumed_at.$lte = new Date(end_date);
    }

    const analytics = await MaterialConsumption.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            material_type: '$material_type',
            material_name: '$material_name'
          },
          total_quantity: { $sum: '$quantity_used' },
          total_waste: { $sum: '$waste_quantity' },
          consumption_count: { $sum: 1 },
          avg_efficiency: {
            $avg: {
              $cond: [
                { $gt: ['$quantity_used', 0] },
                { $multiply: [{ $subtract: [100, { $divide: [{ $multiply: ['$waste_quantity', 100] }, '$quantity_used'] }] }, 1] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          material_type: '$_id.material_type',
          material_name: '$_id.material_name',
          total_quantity: 1,
          total_waste: 1,
          consumption_count: 1,
          avg_efficiency: { $round: ['$avg_efficiency', 2] },
          waste_percentage: {
            $round: [
              {
                $cond: [
                  { $gt: ['$total_quantity', 0] },
                  { $multiply: [{ $divide: ['$total_waste', '$total_quantity'] }, 100] },
                  0
                ]
              },
              2
            ]
          },
          _id: 0
        }
      },
      { $sort: { total_quantity: -1 } }
    ]);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching consumption analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consumption analytics'
    });
  }
};

export {
  getAllMaterialConsumption,
  getMaterialConsumptionById,
  createMaterialConsumption,
  updateMaterialConsumption,
  deleteMaterialConsumption,
  getBatchConsumptionSummary,
  getConsumptionByMaterialType,
  getStepConsumption,
  getConsumptionAnalytics
};
