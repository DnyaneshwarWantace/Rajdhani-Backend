import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import RawMaterial from '../models/RawMaterial.js';
import StockMovement from '../models/StockMovement.js';
import { updateSupplierPerformance } from './supplierController.js';
import { generatePurchaseOrderId, generateOrderNumber } from '../utils/idGenerator.js';

// Create a new purchase order
export const createPurchaseOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      id: await generatePurchaseOrderId(),
      order_number: await generateOrderNumber()
    };

    // Check if supplier exists
    if (orderData.supplier_id) {
      const supplier = await Supplier.findOne({ id: orderData.supplier_id });
      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }
    }

    const purchaseOrder = new PurchaseOrder(orderData);
    await purchaseOrder.save();

    // Update supplier's total orders count
    if (orderData.supplier_id) {
      await Supplier.findOneAndUpdate(
        { id: orderData.supplier_id },
        { $inc: { total_orders: 1, total_value: orderData.total_amount } }
      );
    }

    res.status(201).json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all purchase orders with filtering
export const getPurchaseOrders = async (req, res) => {
  try {
    const { search, status, supplier_id, limit = 50, offset = 0 } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { supplier_name: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (supplier_id) {
      query.supplier_id = supplier_id;
    }

    const orders = await PurchaseOrder.find(query)
      .sort({ order_date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      count
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get purchase order by ID
export const getPurchaseOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update purchase order status
export const updatePurchaseOrder = async (req, res) => {
  try {
    const updateData = req.body;
    const order = await PurchaseOrder.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    const previousStatus = order.status;

    Object.assign(order, updateData);
    await order.save();

    // Handle status change actions
    if (updateData.status && updateData.status !== previousStatus) {
      await handleStatusChange(order, previousStatus, updateData.status);
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Handle purchase order status changes
const handleStatusChange = async (order, previousStatus, newStatus) => {
  try {
    const materialDetails = order.material_details || {};

    // When order is approved, set material to in-transit
    if (newStatus === 'approved') {
      await updateMaterialStatus(order, 'in-transit');
    }

    // When order is cancelled, revert material status
    if (newStatus === 'cancelled') {
      await revertMaterialStatus(order);
    }

    // When order is delivered, update material stock
    if (newStatus === 'delivered') {
      await updateMaterialStock(order);

      // Update supplier performance
      if (order.supplier_id) {
        const rating = 8; // Default good rating, can be customized
        await updateSupplierPerformance(order.supplier_id, rating);
      }
    }
  } catch (error) {
    console.error('Error handling status change:', error);
  }
};

// Update material status to in-transit
const updateMaterialStatus = async (order, status) => {
  try {
    const materialDetails = order.material_details || {};

    const materials = await RawMaterial.find({
      name: materialDetails.materialName,
      supplier_name: order.supplier_name
    });

    if (materials.length > 0) {
      await RawMaterial.updateMany(
        {
          name: materialDetails.materialName,
          supplier_name: order.supplier_name
        },
        { status }
      );
      console.log(`✅ Updated ${materials.length} material(s) to ${status}`);
    }
  } catch (error) {
    console.error('Error updating material status:', error);
  }
};

// Revert material status when order is cancelled
const revertMaterialStatus = async (order) => {
  try {
    const materialDetails = order.material_details || {};

    const materials = await RawMaterial.find({
      name: materialDetails.materialName,
      supplier_name: order.supplier_name
    });

    for (const material of materials) {
      const newStatus = material.current_stock === 0 ? 'out-of-stock' :
                       material.current_stock <= material.min_threshold ? 'low-stock' : 'in-stock';

      material.status = newStatus;
      await material.save();
    }

    console.log(`✅ Reverted status for ${materials.length} material(s)`);
  } catch (error) {
    console.error('Error reverting material status:', error);
  }
};

// Update material stock when order is delivered
const updateMaterialStock = async (order) => {
  try {
    if (!order.items || order.items.length === 0) {
      console.error('No items found in purchase order');
      return;
    }

    for (const item of order.items) {
      const material = await RawMaterial.findOne({ id: item.material_id });
      
      if (!material) {
        console.error(`Material not found: ${item.material_id}`);
        continue;
      }

      const previousStock = material.current_stock;
      const newStock = previousStock + item.quantity;

      // Update material stock
      material.current_stock = newStock;
      material.last_restocked = new Date();
      material.cost_per_unit = item.unit_price;
      material.total_value = newStock * item.unit_price;

      // Recalculate status
      if (newStock <= 0) {
        material.status = 'out-of-stock';
      } else if (newStock <= material.min_threshold) {
        material.status = 'low-stock';
      } else if (newStock > material.max_capacity) {
        material.status = 'overstock';
      } else {
        material.status = 'in-stock';
      }

      await material.save();

      // Record stock movement
      const stockMovement = new StockMovement({
        id: await generateId('SM'),
        material_id: material.id,
        material_name: material.name,
        movement_type: 'in',
        quantity: item.quantity,
        unit: item.unit,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: 'purchase',
        reference_id: order.id,
        reference_type: 'purchase_order',
        cost_per_unit: item.unit_price,
        total_cost: item.total_price,
        operator: 'system',
        notes: `Delivered via ${order.order_number}`
      });
      await stockMovement.save();

      console.log(`✅ Updated material ${material.name}: stock = ${newStock}`);
    }
  } catch (error) {
    console.error('Error updating material stock:', error);
  }
};

// Delete purchase order
export const deletePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findOneAndDelete({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get purchase order statistics
export const getPurchaseOrderStats = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({});

    const stats = {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, order) => sum + order.total_amount, 0),
      pendingOrders: orders.filter(o =>
        ['pending', 'approved', 'shipped'].includes(o.status)
      ).length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      ordersByStatus: {
        pending: orders.filter(o => o.status === 'pending').length,
        approved: orders.filter(o => o.status === 'approved').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching purchase order stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update order status with full workflow handling
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;

    const order = await PurchaseOrder.findOne({ id: orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    const previousStatus = order.status;

    // Update status
    order.status = newStatus;

    // Set actual delivery date if delivered
    if (newStatus === 'delivered') {
      order.actual_delivery = new Date();
    }

    await order.save();

    // Handle status change actions
    await handleStatusChange(order, previousStatus, newStatus);

    res.json({
      success: true,
      data: order,
      message: `Order status updated from ${previousStatus} to ${newStatus}`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Approve purchase order
export const approvePurchaseOrder = async (req, res) => {
  try {
    const { approved_by, notes } = req.body;

    const order = await PurchaseOrder.findOneAndUpdate(
      { id: req.params.id },
      {
        status: 'approved',
        'approval.approved_by': approved_by,
        'approval.approved_at': new Date(),
        'approval.notes': notes
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Purchase order approved successfully'
    });
  } catch (error) {
    console.error('Error approving purchase order:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Mark purchase order as delivered
export const markAsDelivered = async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      });
    }

    // Update order status
    order.status = 'delivered';
    order.actual_delivery = new Date();
    await order.save();

    // Update stock for each item
    await updateMaterialStock(order);

    // Update supplier performance
    if (order.supplier_id) {
      const rating = 8; // Default good rating
      await updateSupplierPerformance(order.supplier_id, rating);
    }

    res.json({
      success: true,
      data: order,
      message: 'Purchase order marked as delivered and stock updated'
    });
  } catch (error) {
    console.error('Error marking order as delivered:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
