import { ProductionBatch, ProductionStep, ProductionFlow, ProductionFlowStep, MaterialConsumption } from '../models/Production.js';
import ProductionMachine from '../models/ProductionMachine.js';
import ProductionWaste from '../models/ProductionWaste.js';
import PlanningDraftState from '../models/PlanningDraftState.js';
import IndividualProduct from '../models/IndividualProduct.js';
import IndividualRawMaterial from '../models/IndividualRawMaterial.js';
import Product from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';
import User from '../models/User.js';
import { generateId } from '../utils/idGenerator.js';
import {
  logProductionStart,
  logProductionMachineAssign,
  logProductionStepComplete,
  logProductionWastageAdd,
  logProductionComplete,
  logProductionRecipeUpdate,
  logProductionIndividualProductSelection,
  logProductionRawMaterialSelection
} from '../utils/detailedLogger.js';

// NOTE: For backward-compatibility with previous endpoints, the "productions"
// endpoints operate on ProductionBatch documents (Supabase parity)

// Create production (batch)
export const createProduction = async (req, res) => {
  try {
    const data = req.body || {};
    const id = await generateId('BATCH');
    const batch_number = data.batch_number || `BATCH-${Date.now().toString().slice(-6)}`;

    // Map incoming data to match ProductionBatch schema
    // Support both old format (planned_quantity) and new format (batch_size)
    const planned_quantity = data.planned_quantity || data.batch_size;
    const product_name = data.product_name || 'Unknown Product';

    if (!planned_quantity) {
      return res.status(400).json({ success: false, error: 'planned_quantity (or batch_size) is required' });
    }

    const batch = new ProductionBatch({
      id,
      batch_number,
      product_id: data.product_id,
      planned_quantity: planned_quantity,
      actual_quantity: data.actual_quantity || 0,
      status: data.status || 'planned',
      priority: data.priority || 'medium',
      start_date: data.start_date || data.planned_start_date || new Date(),
      completion_date: data.completion_date || data.planned_end_date,
      operator: data.operator || data.assigned_operator,
      supervisor: data.supervisor,
      notes: data.notes
    });

    await batch.save();

    // Log production batch creation
    await logProductionStart(req, batch);

    return res.status(201).json({ success: true, data: batch });
  } catch (error) {
    console.error('createProduction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// List productions (batches)
export const getProductions = async (req, res) => {
  try {
    const { status, product_id, order_id, limit = 50, offset = 0 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (product_id) query.product_id = product_id;
    if (order_id) query.order_id = order_id;

    const [items, count] = await Promise.all([
      ProductionBatch.find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset)),
      ProductionBatch.countDocuments(query)
    ]);

    return res.json({ success: true, data: items, count });
  } catch (error) {
    console.error('getProductions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get production (batch) by id with ALL related data
export const getProductionById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ProductionBatch.findOne({ id });
    if (!batch) return res.status(404).json({ success: false, error: 'Not found' });

    // Fetch all related data for this batch
    const [materialConsumption, productionFlow, draftState] = await Promise.all([
      // Get material consumption records
      MaterialConsumption.find({ production_batch_id: id }),
      // Get production flow
      ProductionFlow.findOne({
        $or: [
          { production_batch_id: id },
          { production_product_id: id }
        ]
      }),
      // Get draft state if exists (by batch_id first, then by product_id)
      PlanningDraftState.findOne({
        $or: [
          { production_batch_id: id },
          { product_id: batch.product_id }
        ]
      })
    ]);

    // Get flow steps if flow exists
    let flowSteps = [];
    if (productionFlow) {
      flowSteps = await ProductionFlowStep.find({ flow_id: productionFlow.id }).sort({ order_index: 1 });
    }

    // Convert batch to plain object and add all related data
    const batchData = batch.toObject();

    // Add related collections to batch data
    batchData.material_consumption = materialConsumption || [];
    batchData.production_flow = productionFlow ? {
      ...productionFlow.toObject(),
      steps: flowSteps
    } : null;
    batchData.draft_state = draftState || null;

    console.log(`✅ Fetched batch ${id} with ${materialConsumption?.length || 0} materials, ${flowSteps?.length || 0} flow steps`);

    return res.json({ success: true, data: batchData });
  } catch (error) {
    console.error('getProductionById error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update production (batch)
export const updateProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    
    // Handle nested objects (wastage_stage, final_stage) properly using $set
    const updateQuery = {};
    
    // Separate nested objects from flat fields
    const { wastage_stage, final_stage, ...flatFields } = update;
    
    // Add flat fields first
    Object.assign(updateQuery, flatFields);
    
    // Handle nested wastage_stage
    if (wastage_stage) {
      Object.keys(wastage_stage).forEach(key => {
        updateQuery[`wastage_stage.${key}`] = wastage_stage[key];
      });
    }
    
    // Handle nested final_stage
    if (final_stage) {
      Object.keys(final_stage).forEach(key => {
        updateQuery[`final_stage.${key}`] = final_stage[key];
      });
    }
    
    // Use $set for proper nested updates
    const updated = await ProductionBatch.findOneAndUpdate(
      { id },
      { $set: updateQuery },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    // Log production completion if status changed to completed
    if (update.status === 'completed') {
      await logProductionComplete(req, updated);
      
      // Get current user's full name for inspector
      let inspectorName = 'System';
      if (req.user && req.user.id) {
        try {
          const user = await User.findOne({ id: req.user.id });
          if (user) {
            inspectorName = user.full_name || user.email || 'System';
          }
        } catch (error) {
          console.error('Error fetching user for inspector:', error);
        }
      }
      
      // Update individual products in this batch to 'available' status
      // BUT: Only update products that were CREATED in this batch, not products that were USED as materials
      // Set inspector and default location
      const defaultLocation = 'Warehouse A - General Storage';
      try {
        // First, find all individual products that were USED as materials in this batch
        const MaterialConsumption = (await import('../models/MaterialConsumption.js')).default;
        const consumedMaterials = await MaterialConsumption.find({
          production_batch_id: updated.id,
          material_type: 'product',
          status: 'active'
        }).lean();
        
        // Get all individual product IDs that were used as materials
        const usedProductIds = new Set();
        consumedMaterials.forEach(consumption => {
          if (consumption.individual_product_ids && Array.isArray(consumption.individual_product_ids)) {
            consumption.individual_product_ids.forEach(id => usedProductIds.add(id));
          }
        });
        
        console.log(`📦 Found ${usedProductIds.size} individual products used as materials in batch ${updated.batch_number}`);
        
        // Find all individual products that belong to this batch
        const allBatchProducts = await IndividualProduct.find({
          batch_number: updated.batch_number
        });
        
        // Separate products: those that were used vs those that were created
        const usedProducts = allBatchProducts.filter(ip => usedProductIds.has(ip.id));
        const createdProducts = allBatchProducts.filter(ip => !usedProductIds.has(ip.id));
        
        console.log(`📊 Batch ${updated.batch_number}: ${usedProducts.length} used products, ${createdProducts.length} created products`);
        
        // Only update CREATED products to 'available' status (not the used ones)
        if (createdProducts.length > 0) {
          await IndividualProduct.updateMany(
            { 
              batch_number: updated.batch_number,
              id: { $nin: Array.from(usedProductIds) } // Exclude used products
            },
            {
              $set: {
                status: 'available',
                inspector: inspectorName,
                location: defaultLocation,
                completion_date: new Date().toISOString().split('T')[0],
                updated_at: new Date()
              }
            }
          );
          
          console.log(`✅ Updated ${createdProducts.length} newly created individual products to 'available' status with inspector: ${inspectorName}`);
          console.log(`⚠️  Kept ${usedProducts.length} used products with their current status (should be 'used')`);
        }
        
        // Update product stock counts for all products (both used and created)
        const allProductIds = [...new Set(allBatchProducts.map(ip => ip.product_id))];
        for (const productId of allProductIds) {
          const product = await Product.findOne({ id: productId });
          if (product && product.individual_stock_tracking) {
            const availableCount = await IndividualProduct.countDocuments({
              product_id: productId,
              status: 'available'
            });
            await Product.findOneAndUpdate(
              { id: productId },
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

        // Update IndividualRawMaterial records from 'in_production' to 'used'
        const inProductionMaterials = await IndividualRawMaterial.find({
          production_batch_id: updated.id,
          status: 'in_production'
        });

        console.log(`📦 Found ${inProductionMaterials.length} raw material records in production for batch ${updated.batch_number}`);

        if (inProductionMaterials.length > 0) {
          // Update all in_production materials to 'used'
          await IndividualRawMaterial.updateMany(
            {
              production_batch_id: updated.id,
              status: 'in_production'
            },
            {
              $set: {
                status: 'used',
                updated_at: new Date()
              }
            }
          );

          // Deduct from RawMaterial current_stock
          const materialUpdates = new Map();
          inProductionMaterials.forEach(material => {
            const current = materialUpdates.get(material.material_id) || 0;
            materialUpdates.set(material.material_id, current + material.quantity);
          });

          for (const [materialId, totalQty] of materialUpdates) {
            await RawMaterial.findOneAndUpdate(
              { id: materialId },
              {
                $inc: { current_stock: -totalQty },
                $set: { updated_at: new Date() }
              }
            );
            console.log(`✅ Deducted ${totalQty} from ${materialId} stock (production completed)`);
          }

          console.log(`✅ Updated ${inProductionMaterials.length} raw material records to 'used' status`);
        }
      } catch (error) {
        console.error('Error updating individual products on production completion:', error);
        // Don't fail the request if this fails
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateProduction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete production (batch)
export const deleteProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProductionBatch.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: true });
  } catch (error) {
    console.error('deleteProduction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Batches (explicit) - aliases to keep routes consistent
export const createProductionBatch = createProduction;
export const getProductionBatches = getProductions;
export const getProductionBatchById = getProductionById;
export const updateProductionBatch = updateProduction;

// Machines
export const createProductionMachine = async (req, res) => {
  try {
    const data = req.body || {};
    const id = await generateId('MACHINE');
    const machine = new ProductionMachine({ id, ...data });
    await machine.save();
    return res.status(201).json({ success: true, data: machine });
  } catch (error) {
    console.error('createProductionMachine error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionMachines = async (req, res) => {
  try {
    const { status, machine_type, location, limit = 50, offset = 0 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (machine_type) query.machine_type = machine_type;
    if (location) query.location = location;

    const [items, count] = await Promise.all([
      ProductionMachine.find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset)),
      ProductionMachine.countDocuments(query)
    ]);

    return res.json({ success: true, data: items, count });
  } catch (error) {
    console.error('getProductionMachines error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionMachineById = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await ProductionMachine.findOne({ id });
    if (!machine) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: machine });
  } catch (error) {
    console.error('getProductionMachineById error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProductionMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const updated = await ProductionMachine.findOneAndUpdate({ id }, { ...update }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateProductionMachine error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Waste
export const createProductionWaste = async (req, res) => {
  try {
    const data = req.body || {};
    const id = await generateId('WASTE');
    const waste_number = data.waste_number || `WASTE-${Date.now().toString().slice(-6)}`;
    
    // Get batch to fetch product_id and product_name (required fields)
    // Always fetch from batch to ensure we have the correct product info
    const batchId = data.batch_id || data.production_batch_id;
    let productId = data.product_id;
    let productName = data.product_name;
    
    if (batchId) {
      try {
        const batch = await ProductionBatch.findOne({ id: batchId });
        if (batch) {
          // Always use batch's product_id and product_name (they are the source of truth)
          if (batch.product_id) {
            productId = batch.product_id;
          }
          // Try to get product name from Product collection for accuracy
          if (batch.product_id) {
            try {
              const Product = (await import('../models/Product.js')).default;
              const product = await Product.findOne({ id: batch.product_id });
              if (product && product.name) {
                productName = product.name;
              } else if (batch.product_name) {
                productName = batch.product_name;
              }
            } catch (err) {
              if (batch.product_name) {
                productName = batch.product_name;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching batch for product_id:', err);
      }
    }
    
    // Validate required fields
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'product_id is required. Could not fetch from batch.'
      });
    }
    
    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'product_name is required. Could not fetch from batch.'
      });
    }
    
    // Ensure all required fields are included
    const wasteData = {
      id,
      waste_number,
      production_id: data.production_id || batchId || '',
      batch_id: batchId || '',
      product_id: productId,
      product_name: productName,
      waste_type: data.waste_type || 'other',
      waste_category: data.waste_category || (data.can_be_reused ? 'reusable' : 'disposable'),
      quantity: data.quantity || 0,
      unit: data.unit || '',
      waste_percentage: data.waste_percentage || 0,
      generation_date: data.generation_date ? new Date(data.generation_date) : new Date(),
      reason: data.reason || 'Waste generated during production',
      notes: data.notes || '',
      // Additional fields for waste recovery
      material_id: data.material_id || null,
      material_name: data.material_name || null,
      material_type: data.material_type || 'raw_material', // Track if it's a raw material or product
      can_be_reused: data.can_be_reused === true || data.can_be_reused === 'true' || false,
      individual_product_ids: data.individual_product_ids || [], // Track individual products marked as waste
      individual_products: data.individual_products || [], // Full individual product details
      status: data.status || 'generated'
    };
    
    // If this is the first waste record for this batch, mark wastage_stage as 'in_progress'
    if (batchId) {
      const existingWaste = await ProductionWaste.findOne({ 
        production_batch_id: batchId 
      });
      
      if (!existingWaste) {
        // First waste record - mark wastage stage as in_progress
        await ProductionBatch.findOneAndUpdate(
          { id: batchId },
          { 
            $set: { 
              'wastage_stage.status': 'in_progress',
              'wastage_stage.started_at': new Date(),
              'wastage_stage.started_by': req.user?.email || req.user?.id || 'System',
              'wastage_stage.has_wastage': true
            } 
          }
        );
        console.log(`✅ Marked wastage_stage as 'in_progress' for batch ${batchId}`);
      }
    }
    
    console.log('📝 Creating waste with data:', {
      production_id: wasteData.production_id,
      batch_id: wasteData.batch_id,
      product_id: wasteData.product_id,
      product_name: wasteData.product_name,
      waste_type: wasteData.waste_type,
      can_be_reused: wasteData.can_be_reused,
      waste_category: wasteData.waste_category,
      material_id: wasteData.material_id,
      material_name: wasteData.material_name,
      material_type: wasteData.material_type,
      individual_product_ids: wasteData.individual_product_ids,
      quantity: wasteData.quantity,
      waste_percentage: wasteData.waste_percentage
    });
    
    const waste = new ProductionWaste(wasteData);
    await waste.save();

    console.log('✅ Waste created successfully:', waste.id);

    // Log wastage addition with details
    const batch = await ProductionBatch.findOne({ id: wasteData.production_id || wasteData.batch_id });
    if (batch) {
      await logProductionWastageAdd(req, batch, wasteData);
    }

    return res.status(201).json({ success: true, data: waste });
  } catch (error) {
    console.error('createProductionWaste error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionWaste = async (req, res) => {
  try {
    const { production_id, batch_id, waste_type, status, limit = 50, offset = 0 } = req.query;
    const query = {};
    if (production_id) query.production_id = production_id;
    if (batch_id) query.batch_id = batch_id;
    if (waste_type) query.waste_type = waste_type;
    if (status) query.status = status;

    const [items, count] = await Promise.all([
      ProductionWaste.find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset)),
      ProductionWaste.countDocuments(query)
    ]);

    return res.json({ success: true, data: items, count });
  } catch (error) {
    console.error('getProductionWaste error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionWasteById = async (req, res) => {
  try {
    const { id } = req.params;
    const waste = await ProductionWaste.findOne({ id });
    if (!waste) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: waste });
  } catch (error) {
    console.error('getProductionWasteById error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProductionWaste = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const updated = await ProductionWaste.findOneAndUpdate({ id }, { ...update }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateProductionWaste error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Return waste to inventory
export const returnWasteToInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const waste = await ProductionWaste.findOne({ id });
    
    if (!waste) {
      return res.status(404).json({ success: false, error: 'Waste item not found' });
    }

    // Check if waste can be reused (check can_be_reused field or waste_category)
    const canBeReused = waste.can_be_reused || waste.waste_category === 'reusable';
    if (!canBeReused) {
      return res.status(400).json({ success: false, error: 'This waste item cannot be reused' });
    }

    // Check if already added to inventory
    if (waste.status === 'added_to_inventory' || waste.added_at) {
      return res.status(400).json({ success: false, error: 'Waste has already been returned to inventory' });
    }

    // Find the raw material by material_id or material_name
    const RawMaterial = (await import('../models/RawMaterial.js')).default;
    let material = null;
    
    if (waste.material_id) {
      material = await RawMaterial.findOne({ id: waste.material_id });
    } else if (waste.material_name) {
      material = await RawMaterial.findOne({ name: waste.material_name });
    }

    if (!material) {
      return res.status(404).json({ success: false, error: 'Raw material not found for this waste item' });
    }

    // Add waste quantity back to material stock
    const previousStock = material.current_stock || 0;
    const newStock = previousStock + waste.quantity;
    
    // Update material status based on new stock
    let newStatus = 'in-stock';
    if (newStock <= 0) {
      newStatus = 'out-of-stock';
    } else if (newStock <= (material.min_threshold || 10)) {
      newStatus = 'low-stock';
    } else if (newStock > (material.max_capacity || 1000)) {
      newStatus = 'overstock';
    }

    // Update raw material stock
    material.current_stock = newStock;
    material.status = newStatus;
    await material.save();

    // Update waste status to 'added_to_inventory' and add added_at timestamp
    waste.status = 'added_to_inventory';
    waste.added_at = new Date();
    await waste.save();

    return res.json({
      success: true,
      data: waste,
      message: `${waste.quantity} ${waste.unit} of ${waste.material_name || waste.product_name} returned to inventory`
    });
  } catch (error) {
    console.error('returnWasteToInventory error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Stats (aggregated)
// Production Flow Management
export const createProductionFlow = async (req, res) => {
  try {
    const data = req.body || {};
    
    // Use production_batch_id as primary identifier (clearer and consistent)
    // Accept production_batch_id, production_product_id, or id for backward compatibility
    const production_batch_id = data.production_batch_id || data.production_product_id || data.id;
    
    if (!production_batch_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'production_batch_id (or production_product_id) is required' 
      });
    }
    
    // Check if a flow already exists for this batch (each batch should have only one flow)
    // Check both production_batch_id and production_product_id for backward compatibility
    const existingFlow = await ProductionFlow.findOne({ 
      $or: [
        { production_batch_id },
        { production_product_id: production_batch_id }
      ]
    });
    
    if (existingFlow) {
      // Flow already exists for this batch - return the existing one instead of creating duplicate
      console.log(`Flow already exists for batch ${production_batch_id}, returning existing flow: ${existingFlow.id}`);
      return res.status(200).json({ 
        success: true, 
        data: existingFlow,
        message: 'Flow already exists for this batch, returning existing flow'
      });
    }
    
    // Create new flow with unique ID
    const id = data.id || await generateId('FLOW');
    
    const flow = new ProductionFlow({
      id,
      production_batch_id: production_batch_id, // Primary: clear naming
      production_product_id: production_batch_id, // For backward compatibility (same value)
      flow_name: data.flow_name || `Production Flow ${id}`,
      status: data.status || 'active',
      current_step: data.current_step || 1
    });

    await flow.save();
    return res.status(201).json({ success: true, data: flow });
  } catch (error) {
    console.error('createProductionFlow error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionFlowById = async (req, res) => {
  try {
    const { id } = req.params;
    // Try to find by id first, then by production_batch_id, then production_product_id
    let flow = await ProductionFlow.findOne({ id });

    if (!flow) {
      // If not found by id, try finding by production_batch_id
      flow = await ProductionFlow.findOne({ production_batch_id: id });
    }

    if (!flow) {
      // Fallback: check production_product_id (for old data)
      flow = await ProductionFlow.findOne({ production_product_id: id });
    }

    if (!flow) {
      return res.status(404).json({ success: false, error: 'Production flow not found' });
    }

    // Fetch all flow steps for this flow
    const flowSteps = await ProductionFlowStep.find({ flow_id: flow.id }).sort({ order_index: 1 });

    // Convert flow to plain object and add steps
    const flowData = flow.toObject();
    flowData.production_flow_steps = flowSteps;

    return res.json({ success: true, data: flowData });
  } catch (error) {
    console.error('getProductionFlowById error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionFlowByBatchId = async (req, res) => {
  try {
    const { batchId } = req.params;
    // Check production_batch_id first (primary), then production_product_id for backward compatibility
    let flow = await ProductionFlow.findOne({ production_batch_id: batchId });

    if (!flow) {
      // Fallback: check production_product_id (for old data)
      flow = await ProductionFlow.findOne({ production_product_id: batchId });
    }

    if (!flow) {
      // Also check if batchId is actually a flow ID
      flow = await ProductionFlow.findOne({ id: batchId });
    }

    if (!flow) {
      // Return 200 with null data instead of 404 to avoid console errors when checking existence
      return res.status(200).json({ success: true, data: null, message: 'No flow found for this batch' });
    }

    // Fetch all flow steps for this flow
    const flowSteps = await ProductionFlowStep.find({ flow_id: flow.id }).sort({ order_index: 1 });

    // Convert flow to plain object and add steps
    const flowData = flow.toObject();
    flowData.production_flow_steps = flowSteps;

    return res.json({ success: true, data: flowData });
  } catch (error) {
    console.error('getProductionFlowByBatchId error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProductionFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const updated = await ProductionFlow.findOneAndUpdate({ id }, { ...update }, { new: true });
    
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Production flow not found' });
    }
    
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateProductionFlow error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Production Flow Step Management
export const createProductionFlowStep = async (req, res) => {
  try {
    const data = req.body || {};
    console.log('createProductionFlowStep received data:', JSON.stringify(data, null, 2));
    
    const id = data.id || await generateId('STEP');
    
    // Accept both flow_id and production_flow_id (frontend sends production_flow_id)
    const flow_id = data.flow_id || data.production_flow_id;
    
    if (!flow_id) {
      console.error('Missing flow_id in request:', data);
      return res.status(400).json({ 
        success: false, 
        error: 'flow_id (or production_flow_id) is required',
        received: Object.keys(data)
      });
    }
    
    // Map step_number to order_index if provided (frontend sends step_number)
    const order_index = data.order_index || data.step_number || 1;
    
    // Map inspector to inspector_name if provided
    const inspector_name = data.inspector_name || data.inspector;
    
    const stepData = {
      id,
      flow_id: flow_id,
      step_name: data.step_name || 'Machine Operation',
      step_type: data.step_type || 'machine_operation',
      status: data.status || 'pending',
      order_index: order_index,
      machine_id: data.machine_id,
      inspector_name: inspector_name,
      shift: data.shift || 'day',
      start_time: data.start_time,
      end_time: data.end_time,
      notes: data.notes || data.description
    };
    
    console.log('Creating ProductionFlowStep with data:', JSON.stringify(stepData, null, 2));
    
    const step = new ProductionFlowStep(stepData);

    await step.save();
    console.log('ProductionFlowStep created successfully:', step.id);
    return res.status(201).json({ success: true, data: step });
  } catch (error) {
    console.error('createProductionFlowStep error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};

export const getProductionFlowSteps = async (req, res) => {
  try {
    const { flow_id } = req.query;
    const query = flow_id ? { flow_id } : {};
    
    const steps = await ProductionFlowStep.find(query)
      .sort({ order_index: 1 });
    
    return res.json({ success: true, data: steps });
  } catch (error) {
    console.error('getProductionFlowSteps error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProductionFlowStep = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const updated = await ProductionFlowStep.findOneAndUpdate({ id }, { ...update }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Production flow step not found' });
    }

    // Get flow and batch for logging
    const flow = await ProductionFlow.findOne({ id: updated.flow_id });
    if (flow) {
      const batchId = flow.production_batch_id || flow.production_product_id;
      const batch = await ProductionBatch.findOne({ id: batchId });

      if (batch) {
        // NOTE: Stage tracking is handled by ProductionFlow and ProductionFlowStep
        // No need to update machine_stage in ProductionBatch - it's redundant

        // Log step completion
        if (update.status === 'completed') {
          await logProductionStepComplete(req, batch, updated.step_name);
        }

        // Log machine assignment
        if (update.machine_id && !updated.machine_id) {
          await logProductionMachineAssign(req, batch, update.machine_id);
        }
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateProductionFlowStep error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductionStats = async (req, res) => {
  try {
    const [batches, machines, waste] = await Promise.all([
      ProductionBatch.find({}),
      ProductionMachine.find({}),
      ProductionWaste.find({})
    ]);

    const stats = {
      total_batches: batches.length,
      planned_batches: batches.filter(b => b.status === 'planned').length,
      in_progress_batches: batches.filter(b => b.status === 'in_progress').length,
      completed_batches: batches.filter(b => b.status === 'completed').length,

      total_machines: machines.length,
      active_machines: machines.filter(m => m.status === 'active').length,
      maintenance_machines: machines.filter(m => m.status === 'maintenance').length,

      total_waste_records: waste.length,
      total_waste_quantity: waste.reduce((sum, w) => sum + (w.quantity || 0), 0)
    };

    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('getProductionStats error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Save planning draft state
export const savePlanningDraftState = async (req, res) => {
  try {
    const { product_id, production_batch_id, form_data, recipe_data, materials, consumed_materials } = req.body;
    const user_id = req.user.id;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    // Check if draft state already exists (by product_id and user_id, or by production_batch_id if provided)
    const query = production_batch_id 
      ? { $or: [{ product_id, user_id }, { production_batch_id }] }
      : { product_id, user_id };
    
    let draftState = await PlanningDraftState.findOne(query);

    if (draftState) {
      // Update existing draft state
      draftState.form_data = form_data || draftState.form_data;
      draftState.recipe_data = recipe_data || draftState.recipe_data;
      draftState.materials = materials || draftState.materials;
      draftState.consumed_materials = consumed_materials || draftState.consumed_materials || [];
      if (production_batch_id) {
        draftState.production_batch_id = production_batch_id;
      }
      draftState.updated_at = new Date();
      await draftState.save();
    } else {
      // Create new draft state
      const id = await generateId('DRAFT');
      draftState = new PlanningDraftState({
        id,
        product_id,
        production_batch_id: production_batch_id || null,
        user_id,
        form_data: form_data || {},
        recipe_data: recipe_data || null,
        materials: materials || [],
        consumed_materials: consumed_materials || [],
      });
      await draftState.save();
    }

    return res.json({ success: true, data: draftState });
  } catch (error) {
    console.error('savePlanningDraftState error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get planning draft state
export const getPlanningDraftState = async (req, res) => {
  try {
    const { product_id } = req.params;
    const user_id = req.user.id;

    const draftState = await PlanningDraftState.findOne({ product_id, user_id });

    if (!draftState) {
      return res.status(404).json({ success: false, error: 'Draft state not found' });
    }

    return res.json({ success: true, data: draftState });
  } catch (error) {
    console.error('getPlanningDraftState error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete planning draft state
export const deletePlanningDraftState = async (req, res) => {
  try {
    const { product_id } = req.params;
    const user_id = req.user.id;

    const draftState = await PlanningDraftState.findOneAndDelete({ product_id, user_id });

    if (!draftState) {
      return res.status(404).json({ success: false, error: 'Draft state not found' });
    }

    return res.json({ success: true, message: 'Draft state deleted successfully' });
  } catch (error) {
    console.error('deletePlanningDraftState error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

