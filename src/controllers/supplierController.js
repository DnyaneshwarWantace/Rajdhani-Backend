import Supplier from '../models/Supplier.js';
import RawMaterial from '../models/RawMaterial.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { generateSupplierId } from '../utils/idGenerator.js';

// Create a new supplier
export const createSupplier = async (req, res) => {
  try {
    const supplierData = {
      ...req.body,
      id: await generateSupplierId()
    };

    // Check if supplier with same name exists
    const existingSupplier = await Supplier.findOne({ name: supplierData.name.trim() });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        error: 'A supplier with this name already exists'
      });
    }

    const supplier = new Supplier({
      ...supplierData,
      performance_rating: supplierData.performance_rating || 5,
      total_orders: 0,
      total_value: 0,
      status: 'active'
    });

    await supplier.save();

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    // Calculate actual order stats from purchase orders for each supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        // Get all purchase orders for this supplier (match by both supplier_id and supplier_name)
        const purchaseOrders = await PurchaseOrder.find({
          $or: [
            { supplier_id: supplier.id },
            { supplier_name: supplier.name }
          ]
        });
        
        // Calculate actual stats from purchase orders
        const actualTotalOrders = purchaseOrders.length;
        const actualTotalValue = purchaseOrders.reduce((sum, po) => {
          // Use total_amount from pricing if available, otherwise from root
          const amount = po.pricing?.total_amount || po.total_amount || 0;
          return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
        }, 0);

        // Convert to plain object and update with actual stats
        const supplierObj = supplier.toObject();
        supplierObj.total_orders = actualTotalOrders;
        supplierObj.total_value = actualTotalValue;

        return supplierObj;
      })
    );

    res.json({
      success: true,
      data: suppliersWithStats
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ id: req.params.id });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update supplier
export const updateSupplier = async (req, res) => {
  try {
    const updateData = req.body;
    const supplier = await Supplier.findOne({ id: req.params.id });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (updateData.name && updateData.name !== supplier.name) {
      const existingSupplier = await Supplier.findOne({ name: updateData.name.trim() });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          error: 'A supplier with this name already exists'
        });
      }
    }

    Object.assign(supplier, updateData);
    await supplier.save();

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ id: req.params.id });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    // Check if supplier has associated raw materials
    const materialsCount = await RawMaterial.countDocuments({ supplier_id: req.params.id });
    if (materialsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete supplier. ${materialsCount} raw material(s) are associated with this supplier.`
      });
    }

    await Supplier.findOneAndDelete({ id: req.params.id });

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get supplier statistics
export const getSupplierStats = async (req, res) => {
  try {
    const supplierId = req.params.id;

    // Get supplier details
    const supplier = await Supplier.findOne({ id: supplierId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    // Get materials supplied by this supplier
    const materials = await RawMaterial.find({ supplier_id: supplierId });

    // Get purchase orders for this supplier
    const purchaseOrders = await PurchaseOrder.find({ supplier_id: supplierId });

    const stats = {
      supplier: supplier,
      total_materials: materials.length,
      total_purchase_orders: purchaseOrders.length,
      pending_orders: purchaseOrders.filter(po => po.status === 'pending').length,
      completed_orders: purchaseOrders.filter(po => po.status === 'delivered').length,
      total_order_value: purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0),
      materials_list: materials.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        current_stock: m.current_stock,
        status: m.status
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update supplier performance based on order completion
export const updateSupplierPerformance = async (supplierId, rating) => {
  try {
    const supplier = await Supplier.findOne({ id: supplierId });
    if (!supplier) return;

    // Calculate new average rating
    const currentRating = supplier.performance_rating || 5;
    const totalOrders = supplier.total_orders || 0;

    const newRating = ((currentRating * totalOrders) + rating) / (totalOrders + 1);

    supplier.performance_rating = Math.round(newRating * 10) / 10; // Round to 1 decimal
    await supplier.save();

    console.log(`✅ Updated supplier ${supplier.name} performance to ${supplier.performance_rating}`);
  } catch (error) {
    console.error('Error updating supplier performance:', error);
  }
};
