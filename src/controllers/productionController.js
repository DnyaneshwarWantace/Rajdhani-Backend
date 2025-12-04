import { ProductionBatch, ProductionStep, ProductionFlow, ProductionFlowStep, MaterialConsumption } from '../models/Production.js';
import ProductionMachine from '../models/ProductionMachine.js';
import ProductionWaste from '../models/ProductionWaste.js';
import { generateId } from '../utils/idGenerator.js';
import {
  logProductionStart,
  logProductionMachineAssign,
  logProductionStepComplete,
  logProductionWastageAdd,
  logProductionComplete
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

// Get production (batch) by id
export const getProductionById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ProductionBatch.findOne({ id });
    if (!batch) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: batch });
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
    const updated = await ProductionBatch.findOneAndUpdate(
      { id },
      { ...update },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    // Log production completion if status changed to completed
    if (update.status === 'completed') {
      await logProductionComplete(req, updated);
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
    
    // Ensure all required fields are included
    const wasteData = {
      id,
      waste_number,
      production_id: data.production_id || data.batch_id || '',
      batch_id: data.batch_id || data.production_batch_id || '',
      product_id: data.product_id || '',
      product_name: data.product_name || 'Unknown Product',
      waste_type: data.waste_type || 'other',
      waste_category: data.waste_category || (data.can_be_reused ? 'reusable' : 'disposable'),
      quantity: data.quantity || 0,
      unit: data.unit || '',
      waste_percentage: data.waste_percentage || 0,
      generation_date: data.generation_date ? new Date(data.generation_date) : new Date(),
      generation_stage: data.generation_stage || 'weaving',
      reason: data.reason || 'Waste generated during production',
      notes: data.notes || '',
      // Additional fields for waste recovery
      material_id: data.material_id || null,
      material_name: data.material_name || null,
      material_type: data.material_type || 'raw_material', // Track if it's a raw material or product
      can_be_reused: data.can_be_reused === true || data.can_be_reused === 'true' || false,
      status: data.status || 'generated'
    };
    
    console.log('📝 Creating waste with data:', {
      waste_type: wasteData.waste_type,
      can_be_reused: wasteData.can_be_reused,
      waste_category: wasteData.waste_category,
      material_id: wasteData.material_id,
      material_name: wasteData.material_name
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
    if (waste.status === 'reused' || waste.added_at) {
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

    // Update waste status to 'reused' and add added_at timestamp
    waste.status = 'reused';
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
    const id = data.id || await generateId('FLOW');
    
    const flow = new ProductionFlow({
      id,
      production_product_id: data.production_product_id || data.id,
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
    // Try to find by id first, then by production_product_id
    let flow = await ProductionFlow.findOne({ id });

    if (!flow) {
      // If not found by id, try finding by production_product_id
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
    // Flow ID should equal Batch ID, so check both id and production_product_id
    let flow = await ProductionFlow.findOne({ id: batchId });

    if (!flow) {
      // Also check production_product_id as fallback
      flow = await ProductionFlow.findOne({ production_product_id: batchId });
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
    const id = data.id || await generateId('STEP');
    
    const step = new ProductionFlowStep({
      id,
      flow_id: data.flow_id,
      step_name: data.step_name,
      step_type: data.step_type || 'machine_operation',
      status: data.status || 'pending',
      order_index: data.order_index || 1,
      machine_id: data.machine_id,
      inspector_name: data.inspector_name,
      start_time: data.start_time,
      end_time: data.end_time,
      notes: data.notes
    });

    await step.save();
    return res.status(201).json({ success: true, data: step });
  } catch (error) {
    console.error('createProductionFlowStep error:', error);
    return res.status(500).json({ success: false, error: error.message });
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

    // Log step completion if status changed to completed
    if (update.status === 'completed') {
      const flow = await ProductionFlow.findOne({ id: updated.flow_id });
      if (flow) {
        const batch = await ProductionBatch.findOne({ id: flow.production_product_id || flow.id });
        if (batch) {
          await logProductionStepComplete(req, batch, updated.step_name);
        }
      }
    }

    // Log machine assignment if machine_id was added
    if (update.machine_id && !updated.machine_id) {
      const flow = await ProductionFlow.findOne({ id: updated.flow_id });
      if (flow) {
        const batch = await ProductionBatch.findOne({ id: flow.production_product_id || flow.id });
        if (batch) {
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

