import mongoose from 'mongoose';
import MaterialConsumption from '../models/MaterialConsumption.js';
import { generateId } from '../utils/idGenerator.js';
import Product from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';
import IndividualProduct from '../models/IndividualProduct.js';
import IndividualRawMaterial from '../models/IndividualRawMaterial.js';
import { ProductionBatch } from '../models/Production.js';

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

    // Log incoming individual_product_ids
    console.log(`📥 Received request for ${material_name}:`, {
      individual_product_ids_type: typeof individual_product_ids,
      individual_product_ids_is_array: Array.isArray(individual_product_ids),
      individual_product_ids_length: individual_product_ids?.length || 0,
      individual_product_ids: individual_product_ids || [],
      req_body_individual_product_ids: req.body.individual_product_ids,
    });

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
    
    // Fetch full individual product details if IDs are provided
    let individualProducts = [];
    if (individual_product_ids && individual_product_ids.length > 0) {
      const products = await IndividualProduct.find({
        id: { $in: individual_product_ids }
      }).lean();

      // Get unique product IDs to fetch base product units
      const uniqueProductIds = [...new Set(products.map(p => p.product_id).filter(Boolean))];
      const baseProducts = await Product.find({
        id: { $in: uniqueProductIds }
      }).lean();
      
      // Create a map of product_id to base product for quick lookup
      const baseProductMap = new Map(baseProducts.map(p => [p.id, p]));

      individualProducts = products.map(p => {
        const baseProduct = baseProductMap.get(p.product_id);
        return {
          id: p.id,
          qr_code: p.qr_code,
          serial_number: p.serial_number,
          product_name: p.product_name,
          product_id: p.product_id,
          status: p.status,
          length: p.length,
          width: p.width,
          weight: p.weight,
          length_unit: baseProduct?.length_unit || '',
          width_unit: baseProduct?.width_unit || '',
          weight_unit: baseProduct?.weight_unit || '',
          color: p.color,
          pattern: p.pattern
        };
      });

      console.log(`📦 Fetched ${individualProducts.length} individual product details with units`);
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
      individual_product_ids: individual_product_ids || [], // Array of IDs
      individual_products: individualProducts, // Full product details
      waste_quantity: parseFloat(waste_quantity) || 0,
      waste_type: waste_type || 'normal',
      notes,
      consumed_at: new Date()
    };

    console.log(`💾 Creating MaterialConsumption for ${material_name}:`, {
      material_id,
      material_type,
      quantity_used: qtyUsed,
      actual_consumed_quantity: actualConsumedQty,
      individual_product_ids_count: (individual_product_ids || []).length,
      individual_product_ids: individual_product_ids || [],
    });

    console.log('🔍 consumptionData object:', {
      id: consumptionData.id,
      material_type: consumptionData.material_type,
      actual_consumed_quantity: consumptionData.actual_consumed_quantity,
      individual_product_ids_count: consumptionData.individual_product_ids?.length || 0,
      individual_product_ids: consumptionData.individual_product_ids || [],
    });

    // Set consumption_status for raw materials
    if (material_type === 'raw_material') {
      // For raw materials: default to 'in_production' (will change to 'used' when wastage completes)
      consumptionData.consumption_status = req.body.consumption_status || 'in_production';
    } else {
      // For products: consumption_status doesn't apply (they use individual product statuses)
      consumptionData.consumption_status = undefined;
    }

    // Create consumption using Mongoose (ensure same collection as GET)
    const consumption = new MaterialConsumption(consumptionData);

    console.log('🔍 Document before save:', {
      id: consumption.id,
      material_type: consumption.material_type,
      actual_consumed_quantity: consumption.actual_consumed_quantity,
      individual_product_ids_count: consumption.individual_product_ids?.length || 0,
      individual_product_ids: consumption.individual_product_ids || [],
    });

    await consumption.save();

    console.log('🔍 Document after save (from Mongoose):', {
      id: consumption.id,
      material_type: consumption.material_type,
      actual_consumed_quantity: consumption.actual_consumed_quantity,
      individual_product_ids_count: consumption.individual_product_ids?.length || 0,
      individual_product_ids: consumption.individual_product_ids || [],
    });

    console.log('✅ Document saved with _id:', consumption._id);
    console.log('✅ Document saved with custom id:', consumption.id);

    const savedConsumption = consumption.toObject();

    console.log(`✅ MaterialConsumption final state with ID: ${savedConsumption.id}`, {
      saved_individual_product_ids: savedConsumption.individual_product_ids?.length || 0,
      saved_individual_product_ids_array: savedConsumption.individual_product_ids || [],
    });

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
        // For raw materials: Only deduct if consumption_status is 'used'
        // If status is 'in_production', don't deduct yet (will deduct when wastage completes)
        const consumptionStatus = req.body.consumption_status || 'in_production';

        if (consumptionStatus === 'used') {
          // Deduct from inventory only when status is 'used'
          await RawMaterial.findOneAndUpdate(
            { id: material_id },
            {
              $inc: { current_stock: -quantity_used },
              $set: { updated_at: new Date() }
            }
          );

          // Mark IndividualRawMaterial records as 'used'
          const availableMaterials = await IndividualRawMaterial.find({
            material_id: material_id,
            status: 'available'
          }).sort({ purchase_date: 1 }).limit(100);

          let remaining = quantity_used;
          for (const material of availableMaterials) {
            if (remaining <= 0) break;

            if (material.quantity <= remaining) {
              // Use entire material record
              material.status = 'used';
              material.production_batch_id = production_batch_id;
              await material.save();
              remaining -= material.quantity;
            } else {
              // Split material record
              const usedQty = remaining;
              const availableQty = material.quantity - remaining;

              // Update existing record to reduce quantity
              material.quantity = availableQty;
              await material.save();

              // Create new record for used portion
              const usedMaterial = new IndividualRawMaterial({
                id: await generateId('IRM'),
                material_id: material.material_id,
                material_name: material.material_name,
                quantity: usedQty,
                unit: material.unit,
                status: 'used',
                production_batch_id: production_batch_id,
                purchase_date: material.purchase_date,
                supplier_id: material.supplier_id,
                supplier_name: material.supplier_name,
                cost_per_unit: material.cost_per_unit,
                total_cost: usedQty * material.cost_per_unit,
                notes: `Used in production batch ${production_batch_id}`
              });
              await usedMaterial.save();
              remaining = 0;
            }
          }

          console.log(`✅ Deducted ${quantity_used} ${unit} of ${material_name} from inventory (status: used)`);
        } else {
          // Status is 'in_production' - mark IndividualRawMaterial as 'in_production'
          const availableMaterials = await IndividualRawMaterial.find({
            material_id: material_id,
            status: 'available'
          }).sort({ purchase_date: 1 }).limit(100);

          let remaining = quantity_used;
          for (const material of availableMaterials) {
            if (remaining <= 0) break;

            if (material.quantity <= remaining) {
              // Use entire material record
              material.status = 'in_production';
              material.production_batch_id = production_batch_id;
              await material.save();
              remaining -= material.quantity;
            } else {
              // Split material record
              const inProdQty = remaining;
              const availableQty = material.quantity - remaining;

              // Update existing record to reduce quantity
              material.quantity = availableQty;
              await material.save();

              // Create new record for in_production portion
              const inProdMaterial = new IndividualRawMaterial({
                id: await generateId('IRM'),
                material_id: material.material_id,
                material_name: material.material_name,
                quantity: inProdQty,
                unit: material.unit,
                status: 'in_production',
                production_batch_id: production_batch_id,
                purchase_date: material.purchase_date,
                supplier_id: material.supplier_id,
                supplier_name: material.supplier_name,
                cost_per_unit: material.cost_per_unit,
                total_cost: inProdQty * material.cost_per_unit,
                notes: `In production for batch ${production_batch_id}`
              });
              await inProdMaterial.save();
              remaining = 0;
            }
          }

          // Status is 'in_production' - don't deduct yet, just track consumption
          console.log(`📦 Raw material ${material_name}: ${quantity_used} ${unit} marked as 'in_production' (not deducted yet)`);
        }
      }
    }

    // Update individual product status if individual products are specified
    // IMPORTANT: Mark as "in_production" when production starts, "used" only when wastage is recorded
    if (individual_product_ids && individual_product_ids.length > 0) {
      // Always mark individual products as "in_production" when they're added to production
      // This happens when production starts (deduct_now can be false for planning, but we still mark as in_production)
      // Also set the batch_number so we can track which batch they belong to
      const batch = await ProductionBatch.findOne({ id: production_batch_id });
      const batchNumber = batch?.batch_number || null;
      
      await IndividualProduct.updateMany(
        { id: { $in: individual_product_ids } },
        {
          $set: {
            status: 'in_production',
            batch_number: batchNumber,
            updated_at: new Date()
          }
        }
      );
      console.log(`✅ Marked ${individual_product_ids.length} individual products as in_production (batch: ${batchNumber})`);

      // CRITICAL: Update parent product's current_stock to reflect only available products
      // Get the first individual product to find its product_id
      const firstIndividualProduct = await IndividualProduct.findOne({ id: individual_product_ids[0] });
      if (firstIndividualProduct && firstIndividualProduct.product_id) {
        const parentProduct = await Product.findOne({ id: firstIndividualProduct.product_id });
        if (parentProduct && parentProduct.individual_stock_tracking) {
          // Count only "available" status individual products
          const availableCount = await IndividualProduct.countDocuments({
            product_id: firstIndividualProduct.product_id,
            status: 'available'
          });
          // Count total individual products (all statuses)
          const totalCount = await IndividualProduct.countDocuments({
            product_id: firstIndividualProduct.product_id
          });

          // Update parent product's stock counts
          // current_stock = available only (for planning/selling operations)
          // individual_products_count = total count (for tracking/display)
          parentProduct.current_stock = availableCount;
          parentProduct.individual_products_count = totalCount;
          await parentProduct.save();
          console.log(`✅ Updated parent product ${firstIndividualProduct.product_id} stock: ${availableCount} available / ${totalCount} total (${individual_product_ids.length} moved to in_production)`);
        }
      }

      // Only mark as "used" if deduct_now is true AND we're actually consuming (not just planning)
      // Note: "used" status should typically be set when wastage is recorded, not here
      // This is kept for backward compatibility
      if (deductNow && material_type === 'raw_material') {
        // For raw materials, mark as used immediately if deduct_now is true
        await IndividualProduct.updateMany(
          { id: { $in: individual_product_ids } },
          { 
            $set: { 
              status: 'used',
              updated_at: new Date()
            }
          }
        );
        console.log(`✅ Marked ${individual_product_ids.length} individual products as used (raw material, deduct_now=true)`);
      }
    } else if (material_type === 'product') {
      // Fallback: If no individual_product_ids were provided but this is a product with individual tracking,
      // try to find used individual products that match this consumption record
      const product = await Product.findOne({ id: material_id });
      if (product && product.individual_stock_tracking) {
        // Look for individual products that were used around the same time
        const consumedDate = new Date(savedConsumption.consumed_at);
        const startDate = new Date(consumedDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
        const endDate = new Date(consumedDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after

        const usedProducts = await IndividualProduct.find({
          product_id: material_id,
          status: 'used',
          updated_at: {
            $gte: startDate,
            $lte: endDate
          }
        }).limit(quantity_used || 10);

        if (usedProducts.length > 0) {
          const foundIds = usedProducts.map(ip => ip.id);
          await MaterialConsumption.findOneAndUpdate(
            { id: savedConsumption.id },
            { $set: { individual_product_ids: foundIds } }
          );
          console.log(`✅ Auto-found and saved ${foundIds.length} individual product IDs: ${foundIds.join(', ')}`);
        }
      }
    }

    // Use savedConsumption directly - it's the Mongoose document we just saved
    const finalConsumption = savedConsumption;

    // NOTE: Stage tracking is handled by ProductionFlow and ProductionFlowStep
    // No need to update planning_stage in ProductionBatch - it's redundant

    console.log(`📤 Returning response for ${material_name}:`, {
      id: finalConsumption.id,
      individual_product_ids_count: finalConsumption.individual_product_ids?.length || 0,
      individual_product_ids: finalConsumption.individual_product_ids || [],
    });

    res.status(201).json({
      success: true,
      data: finalConsumption,
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

    // Handle status updates based on material type
    // For product-type materials: Always check and update individual products when consumption_status is set to 'used'
    // This happens when wastage stage is completed
    if (updateData.consumption_status === 'used' || (consumption.material_type === 'product' && updateData.consumption_status === 'used')) {
      if (consumption.material_type === 'raw_material') {
        // For raw materials: When status changes to 'used', deduct from inventory
        if (existingConsumption.consumption_status !== 'used') {
          // Only deduct if status is changing from 'in_production' to 'used'
          await RawMaterial.findOneAndUpdate(
            { id: consumption.material_id },
            { 
              $inc: { current_stock: -consumption.quantity_used },
              $set: { updated_at: new Date() }
            }
          );
          console.log(`✅ Deducted ${consumption.quantity_used} ${consumption.unit} of ${consumption.material_name} from inventory (status changed to 'used')`);
        }
      } else if (consumption.material_type === 'product' && 
          consumption.individual_product_ids && 
          consumption.individual_product_ids.length > 0) {
        
        // For products: Mark individual products as used when wastage is completed
        // This is CRITICAL - when wastage stage completes, all individual products used as materials
        // must change from 'in_production' to 'used'
        console.log(`🔄 Checking individual products for product material: ${consumption.material_name}`);
        console.log(`📦 Individual product IDs: ${consumption.individual_product_ids.length}`);
        
        const individualProducts = await IndividualProduct.find({
          id: { $in: consumption.individual_product_ids }
        });
        
        console.log(`📦 Found ${individualProducts.length} individual products in database`);
        
        const productsInProduction = individualProducts.filter(ip => ip.status === 'in_production');
        
        console.log(`📦 Products still in 'in_production': ${productsInProduction.length}`);
        
        if (productsInProduction.length > 0) {
          // Mark these individual products as used (wastage step completed)
          const productIdsToUpdate = productsInProduction.map(ip => ip.id);
          await IndividualProduct.updateMany(
            { id: { $in: productIdsToUpdate } },
            { 
              $set: { 
                status: 'used',
                updated_at: new Date()
              }
            }
          );
          
          console.log(`✅ Marked ${productsInProduction.length} individual products as used (wastage step completed)`);
          console.log(`✅ Updated product IDs:`, productIdsToUpdate);
          
          // Also update product stock counts
          const product = await Product.findOne({ id: consumption.material_id });
          if (product && product.individual_stock_tracking) {
            const availableCount = await IndividualProduct.countDocuments({
              product_id: consumption.material_id,
              status: 'available'
            });
            const totalCount = await IndividualProduct.countDocuments({
              product_id: consumption.material_id
            });
            await Product.findOneAndUpdate(
              { id: consumption.material_id },
              {
                $set: {
                  current_stock: availableCount, // Only available products (for operations)
                  individual_products_count: totalCount, // Total count (for tracking/display)
                  updated_at: new Date()
                }
              }
            );
            console.log(`✅ Updated product stock count: ${availableCount} available / ${totalCount} total`);
          }
        } else {
          console.log(`ℹ️ No individual products in 'in_production' status to update for ${consumption.material_name}`);
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

// Get consumption history for a specific raw material
const getRawMaterialConsumptionHistory = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { start_date, end_date, status, limit = 100 } = req.query;

    const filter = {
      material_id: materialId,
      material_type: 'raw_material',
      status: 'active'
    };

    if (status) {
      filter.consumption_status = status;
    }

    if (start_date || end_date) {
      filter.consumed_at = {};
      if (start_date) filter.consumed_at.$gte = new Date(start_date);
      if (end_date) filter.consumed_at.$lte = new Date(end_date);
    }

    let consumption = await MaterialConsumption.find(filter)
      .sort({ consumed_at: -1 })
      .limit(parseInt(limit))
      .lean();

    // Populate batch information
    const batchIds = [...new Set(consumption.map(c => c.production_batch_id).filter(Boolean))];
    const batches = await ProductionBatch.find({ id: { $in: batchIds } }).lean();
    const batchMap = new Map(batches.map(b => [b.id, b]));

    // Get product IDs from batches
    const productIds = [...new Set(batches.map(b => b.product_id).filter(Boolean))];
    const products = await Product.find({ id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [p.id, p]));

    // Enrich consumption records with batch and product information
    consumption = consumption.map(record => {
      const batch = batchMap.get(record.production_batch_id);
      const product = batch?.product_id ? productMap.get(batch.product_id) : null;
      return {
        ...record,
        batch_number: batch?.batch_number || null,
        product_id: product?.id || batch?.product_id || null,
        product_name: product?.name || batch?.product_name || null,
        product_category: product?.category || null,
        product_color: product?.color || null,
        product_pattern: product?.pattern || null,
      };
    });

    // Calculate summary statistics
    const summary = {
      total_used: 0,
      in_production: 0,
      used: 0,
      reserved: 0,
      sold: 0,
      by_status: {}
    };

    consumption.forEach(record => {
      summary.total_used += record.quantity_used || 0;
      const recordStatus = record.consumption_status || 'in_production';
      summary[recordStatus] = (summary[recordStatus] || 0) + (record.quantity_used || 0);
      summary.by_status[recordStatus] = (summary.by_status[recordStatus] || 0) + (record.quantity_used || 0);
    });

    res.json({
      success: true,
      data: consumption,
      summary
    });
  } catch (error) {
    console.error('Error fetching raw material consumption history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch raw material consumption history'
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
  getConsumptionAnalytics,
  getRawMaterialConsumptionHistory
};
