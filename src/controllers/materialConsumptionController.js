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
      actual_consumed_quantity, // For products: actual fractional consumption (e.g., 2.4)
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
    
    // For products: calculate actual_consumed_quantity if not provided
    // quantity_used = whole products (e.g., 3), actual_consumed_quantity = actual recipe quantity (e.g., 2.4)
    let actualConsumedQty = actual_consumed_quantity;
    if (material_type === 'product' && actualConsumedQty === undefined) {
      // If individual products are selected, actual_consumed_quantity should be the recipe quantity
      // If not provided, use quantity_used as fallback (for backward compatibility)
      actualConsumedQty = qtyUsed;
    } else if (material_type === 'raw_material') {
      // For raw materials, actual_consumed_quantity = quantity_used
      actualConsumedQty = actual_consumed_quantity !== undefined ? actual_consumed_quantity : qtyUsed;
    }
    
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
      quantity_used: qtyUsed, // Whole products count (e.g., 3)
      actual_consumed_quantity: actualConsumedQty, // Actual recipe quantity (e.g., 2.4)
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
        // For products with individual products selected, deduct whole units
        if (individual_product_ids && individual_product_ids.length > 0) {
          // When individual products are selected, deduct the full quantity of those individual products
          // Each individual product is a whole unit, so deduct the count of individual products
          const quantityToDeduct = individual_product_ids.length;
          
          console.log(`📦 Deducting ${quantityToDeduct} whole units (${individual_product_ids.length} individual products) from product ${material_id}`);
          console.log(`📋 Recipe required: ${quantity_used} ${unit}, but consuming ${quantityToDeduct} whole units`);
          
          await Product.findOneAndUpdate(
            { id: material_id },
            { 
              $inc: { base_quantity: -quantityToDeduct }, // Deduct whole units, not recipe quantity
              $set: { updated_at: new Date() }
            }
          );
          
          // Also update individual_products_count and current_stock if the product uses individual tracking
          const product = await Product.findOne({ id: material_id });
          if (product && product.individual_stock_tracking) {
            const availableCount = await IndividualProduct.countDocuments({
              product_id: material_id,
              status: 'available'
            });
            await Product.findOneAndUpdate(
              { id: material_id },
              { 
                $set: { 
                  current_stock: availableCount,
                  individual_products_count: availableCount,
                  updated_at: new Date()
                }
              }
            );
          }
        } else {
          // No individual products selected, deduct recipe quantity (for bulk products)
          await Product.findOneAndUpdate(
            { id: material_id },
            { 
              $inc: { base_quantity: -quantity_used },
              $set: { updated_at: new Date() }
            }
          );
        }
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
    // IMPORTANT: Only mark as consumed if deduct_now is true (actual consumption, not just planning)
    // IMPORTANT: Ensure individual_product_ids are always saved in the consumption record
    if (individual_product_ids && individual_product_ids.length > 0) {
      // Ensure the consumption record has these IDs saved
      if (!consumption.individual_product_ids || consumption.individual_product_ids.length === 0) {
        consumption.individual_product_ids = individual_product_ids;
        await consumption.save();
        console.log(`✅ Saved individual product IDs to consumption record: ${individual_product_ids.join(', ')}`);
      }
      
      // Only mark individual products as consumed if deduct_now is true (actual consumption)
      if (deductNow) {
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
        console.log(`✅ Marked ${individual_product_ids.length} individual products as consumed (deduct_now=true)`);
      } else {
        console.log(`ℹ️ Individual product IDs saved but NOT marked as consumed yet (deduct_now=false - planning phase)`);
      }
    } else if (material_type === 'product') {
      // Fallback: If no individual_product_ids were provided but this is a product with individual tracking,
      // try to find consumed individual products that match this consumption record
      const product = await Product.findOne({ id: material_id });
      if (product && product.individual_stock_tracking) {
        // Look for individual products that were consumed around the same time
        const consumedDate = new Date(consumption.consumed_at);
        const startDate = new Date(consumedDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
        const endDate = new Date(consumedDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after
        
        const consumedProducts = await IndividualProduct.find({
          product_id: material_id,
          status: 'consumed',
          consumed_at: {
            $gte: startDate,
            $lte: endDate
          }
        }).limit(quantity_used || 10);
        
        if (consumedProducts.length > 0) {
          const foundIds = consumedProducts.map(ip => ip.id);
          consumption.individual_product_ids = foundIds;
          await consumption.save();
          console.log(`✅ Auto-found and saved ${foundIds.length} individual product IDs: ${foundIds.join(', ')}`);
        }
      }
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

    // Get the existing consumption record to check if we need to mark individual products as consumed
    const existingConsumption = await MaterialConsumption.findOne({ id, status: 'active' });
    
    if (!existingConsumption) {
      return res.status(404).json({
        success: false,
        error: 'Material consumption record not found'
      });
    }

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

    // IMPORTANT: If this is a product with individual_product_ids and they haven't been consumed yet,
    // mark them as consumed now (this happens when wastage is completed)
    // Check if individual products need to be marked as consumed
    if (consumption.material_type === 'product' && 
        consumption.individual_product_ids && 
        consumption.individual_product_ids.length > 0) {
      
      // Check if any of these individual products are still available (not consumed)
      const individualProducts = await IndividualProduct.find({
        id: { $in: consumption.individual_product_ids }
      });
      
      const availableProducts = individualProducts.filter(ip => ip.status === 'available');
      
      if (availableProducts.length > 0) {
        // Mark these individual products as consumed (wastage step completed)
        await IndividualProduct.updateMany(
          { id: { $in: availableProducts.map(ip => ip.id) } },
          { 
            $set: { 
              status: 'consumed',
              consumed_at: new Date(),
              updated_at: new Date()
            }
          }
        );
        
        console.log(`✅ Marked ${availableProducts.length} individual products as consumed (wastage step completed)`);
        
        // Also update product stock counts
        const product = await Product.findOne({ id: consumption.material_id });
        if (product && product.individual_stock_tracking) {
          const availableCount = await IndividualProduct.countDocuments({
            product_id: consumption.material_id,
            status: 'available'
          });
          await Product.findOneAndUpdate(
            { id: consumption.material_id },
            { 
              $set: { 
                current_stock: availableCount,
                individual_products_count: availableCount,
                updated_at: new Date()
              }
            }
          );
        }
      }
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
