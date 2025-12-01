import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import IndividualProduct from '../models/IndividualProduct.js';
import RawMaterial from '../models/RawMaterial.js';
import { generateOrderId, generateOrderNumber, generateOrderItemId } from '../utils/idGenerator.js';

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      id: await generateOrderId(),
      order_number: await generateOrderNumber()
    };

    // Validate customer exists
    if (orderData.customer_id) {
      const customer = await Customer.findOne({ id: orderData.customer_id });
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      // Update customer info in order
      orderData.customer_name = customer.name;
      orderData.customer_email = customer.email;
      orderData.customer_phone = customer.phone;
    }

    // Convert delivery address to string if it's an object
    if (orderData.delivery_address && typeof orderData.delivery_address === 'object') {
      orderData.delivery_address = JSON.stringify(orderData.delivery_address);
    }

    // Set default GST settings if not provided
    if (orderData.gst_included === undefined) {
      orderData.gst_included = true;
    }
    if (!orderData.gst_rate) {
      orderData.gst_rate = 18;
    }

    const order = new Order(orderData);
    await order.save();

    // Create order items if provided
    if (orderData.items && orderData.items.length > 0) {
      for (const itemData of orderData.items) {
        console.log('========== ITEM DATA RECEIVED FROM FRONTEND ==========');
        console.log('Product:', itemData.product_name);
        console.log('Quantity:', itemData.quantity);
        console.log('unit_price from frontend:', itemData.unit_price);
        console.log('total_price from frontend:', itemData.total_price);
        console.log('pricing_unit from frontend:', itemData.pricing_unit);
        console.log('unit_value from frontend:', itemData.unit_value);
        console.log('product_dimensions from frontend:', itemData.product_dimensions);
        console.log('======================================================');

        // Use the total_price from frontend if provided (already calculated with SQM logic)
        // Otherwise fall back to quantity * unit_price
        const totalPrice = itemData.total_price !== undefined
          ? itemData.total_price
          : (itemData.quantity * itemData.unit_price);

        console.log('FINAL totalPrice to save:', totalPrice);

        const orderItem = new OrderItem({
          id: await generateOrderItemId(),
          order_id: order.id,
          product_id: itemData.product_id || null,
          individual_product_id: itemData.individual_product_id || null,
          product_name: itemData.product_name,
          product_type: itemData.product_type || 'product',
          quantity: itemData.quantity,
          unit_price: itemData.unit_price.toString(),
          total_price: totalPrice.toString(),
          quality_grade: itemData.quality_grade || 'A',
          specifications: itemData.specifications || null,
          selected_individual_products: itemData.selected_individual_products || [],
          // Store additional pricing info if provided
          pricing_unit: itemData.pricing_unit || null,
          unit_value: itemData.unit_value || null,
          product_dimensions: itemData.product_dimensions || null
        });
        await orderItem.save();
      }

      // Recalculate order totals after creating items
      const items = await OrderItem.find({ order_id: order.id });
      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const gstRate = parseFloat(order.gst_rate) || 18;
      const discountAmount = parseFloat(order.discount_amount) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;
      
      // Calculate GST amount based on whether GST is included
      let gstAmount = 0;
      if (order.gst_included) {
        gstAmount = (subtotal * gstRate) / 100;
      }
      
      // Calculate total amount
      const totalAmount = subtotal + gstAmount - discountAmount;
      
      // Calculate outstanding amount
      const outstandingAmount = totalAmount - paidAmount;
      
      // Update order with calculated values
      await Order.findOneAndUpdate(
        { id: order.id },
        {
          subtotal: subtotal.toFixed(2),
          gst_amount: gstAmount.toFixed(2),
          total_amount: totalAmount.toFixed(2),
          outstanding_amount: outstandingAmount.toFixed(2)
        }
      );
    }

    // Update customer statistics if customer exists
    if (orderData.customer_id) {
      await Customer.findOneAndUpdate(
        { id: orderData.customer_id },
        { 
          $inc: { 
            total_orders: 1
          },
          $set: {
            total_value: order.total_amount,
            last_order_date: new Date()
          }
        }
      );
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all orders with filtering
export const getOrders = async (req, res) => {
  try {
    const { 
      search, 
      status, 
      customer_id,
      priority,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = {};

    // Apply filters
    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    const orders = await Order.find(query)
      .sort({ order_date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Populate order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        const items = await OrderItem.find({ order_id: order.id });
        orderObj.order_items = items;
        return orderObj;
      })
    );

    const count = await Order.countDocuments(query);

    res.json({
      success: true,
      data: ordersWithItems,
      count
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get order items
    const orderItems = await OrderItem.find({ order_id: order.id });

    res.json({
      success: true,
      data: {
        order,
        items: orderItems
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update order
export const updateOrder = async (req, res) => {
  try {
    const updateData = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const oldStatus = order.status;
    Object.assign(order, updateData);
    
    // If status changed to dispatched or delivered, trigger stock deduction
    if ((updateData.status === 'dispatched' || updateData.status === 'delivered') && oldStatus !== updateData.status) {
      console.log(`🚀 Status changed to ${updateData.status}, triggering stock deduction for order: ${order.id}`);
      try {
        await markIndividualProductsAsSold(order.id);
        console.log(`✅ Stock deduction completed for order: ${order.id}`);
      } catch (error) {
        console.error(`❌ Error in stock deduction for order ${order.id}:`, error);
      }
    }

    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const validStatuses = ['pending', 'accepted', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update status and set appropriate timestamp
    order.status = status;
    const now = new Date();

    console.log(`🔄 Updating order ${order.id} status to: ${status}`);
    switch (status) {
      case 'accepted':
        order.accepted_at = now;
        order.workflow_step = 'dispatch';
        break;
      case 'dispatched':
        order.dispatched_at = now;
        order.workflow_step = 'delivered';
        // Mark individual products as sold when dispatched
        try {
          console.log(`🚀 About to call markIndividualProductsAsSold for order: ${order.id}`);
          await markIndividualProductsAsSold(order.id);
          console.log(`✅ markIndividualProductsAsSold completed for order: ${order.id}`);
        } catch (error) {
          console.error(`❌ Error in markIndividualProductsAsSold for order ${order.id}:`, error);
        }
        break;
      case 'delivered':
        order.delivered_at = now;
        // Also trigger stock deduction if not already done
        await markIndividualProductsAsSold(order.id);
        break;
    }

    await order.save();

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Add item to order
export const addOrderItem = async (req, res) => {
  try {
    const { order_id } = req.params;
    const itemData = req.body;

    // Validate order exists
    const order = await Order.findOne({ id: order_id });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validate product exists
    const product = await Product.findOne({ id: itemData.product_id });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const orderItem = new OrderItem({
      id: await generateOrderItemId(),
      order_id,
      product_id: itemData.product_id,
      individual_product_id: itemData.individual_product_id || null,
      product_name: product.name,
      product_type: itemData.product_type || 'product',
      quantity: itemData.quantity,
      unit_price: itemData.unit_price.toString(),
      quality_grade: itemData.quality_grade || 'A',
      specifications: itemData.specifications || null
    });

    await orderItem.save();

    // Update order totals
    await updateOrderTotals(order_id);

    res.status(201).json({
      success: true,
      data: orderItem
    });
  } catch (error) {
    console.error('Error adding order item:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update order item
export const updateOrderItem = async (req, res) => {
  try {
    const { item_id } = req.params;
    const updateData = req.body;

    const orderItem = await OrderItem.findOne({ id: item_id });
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        error: 'Order item not found'
      });
    }

    Object.assign(orderItem, updateData);
    await orderItem.save();

    // Update order totals
    await updateOrderTotals(orderItem.order_id);

    res.json({
      success: true,
      data: orderItem
    });
  } catch (error) {
    console.error('Error updating order item:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Remove item from order
export const removeOrderItem = async (req, res) => {
  try {
    const { item_id } = req.params;

    const orderItem = await OrderItem.findOne({ id: item_id });
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        error: 'Order item not found'
      });
    }

    const orderId = orderItem.order_id;
    await OrderItem.findOneAndDelete({ id: item_id });

    // Update order totals
    await updateOrderTotals(orderId);

    res.json({
      success: true,
      message: 'Order item removed successfully'
    });
  } catch (error) {
    console.error('Error removing order item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update order totals
const updateOrderTotals = async (orderId) => {
  try {
    const orderItems = await OrderItem.find({ order_id: orderId });
    const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price) || 0, 0);

    const order = await Order.findOne({ id: orderId });
    if (order) {
      order.subtotal = subtotal.toFixed(2);
      await order.save(); // This will trigger the pre-save middleware to recalculate totals
    }
  } catch (error) {
    console.error('Error updating order totals:', error);
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    // Use MongoDB aggregation for much faster stats calculation
    const statsAggregation = await Order.aggregate([
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          financials: [
            {
              $group: {
                _id: null,
                total_order_value: { $sum: { $toDouble: '$total_amount' } },
                total_paid_amount: { $sum: { $toDouble: '$paid_amount' } },
                total_outstanding: { $sum: { $toDouble: '$outstanding_amount' } },
                total_orders: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const statusCounts = {};
    statsAggregation[0].statusCounts.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    const financials = statsAggregation[0].financials[0] || {
      total_order_value: 0,
      total_paid_amount: 0,
      total_outstanding: 0,
      total_orders: 0
    };

    const stats = {
      total_orders: financials.total_orders,
      pending_orders: statusCounts.pending || 0,
      accepted_orders: statusCounts.accepted || 0,
      in_production_orders: statusCounts.in_production || 0,
      ready_orders: statusCounts.ready || 0,
      dispatched_orders: statusCounts.dispatched || 0,
      delivered_orders: statusCounts.delivered || 0,
      cancelled_orders: statusCounts.cancelled || 0,
      total_order_value: financials.total_order_value || 0,
      total_paid_amount: financials.total_paid_amount || 0,
      total_outstanding: financials.total_outstanding || 0,
      average_order_value: financials.total_orders > 0 ? (financials.total_order_value / financials.total_orders) : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update individual product selections for an order item
export const updateOrderItemIndividualProducts = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { selected_individual_products } = req.body;

    const orderItem = await OrderItem.findOne({ id: item_id });
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        error: 'Order item not found'
      });
    }

    // Validate individual products exist and are available
    const individualProductIds = selected_individual_products.map(p => p.individual_product_id);
    const individualProducts = await IndividualProduct.find({ 
      id: { $in: individualProductIds },
      status: 'available'
    });

    if (individualProducts.length !== individualProductIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some selected individual products are not available'
      });
    }

    // Update the order item with selected individual products
    orderItem.selected_individual_products = selected_individual_products.map(ip => ({
      individual_product_id: ip.individual_product_id,
      qr_code: ip.qr_code,
      serial_number: ip.serial_number,
      status: 'allocated',
      allocated_at: new Date()
    }));

    await orderItem.save();

    // Check if all items in the order have their individual products selected
    const order = await Order.findOne({ id: orderItem.order_id });
    const allOrderItems = await OrderItem.find({ order_id: order.id });
    const allItemsReady = allOrderItems.every(item => 
      item.selected_individual_products.length >= item.quantity
    );

    if (allItemsReady && order.status === 'accepted') {
      order.workflow_step = 'dispatch';
      await order.save();
    }

    res.json({
      success: true,
      data: orderItem,
      all_items_ready: allItemsReady
    });
  } catch (error) {
    console.error('Error updating individual products:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update order payment
export const updateOrderPayment = async (req, res) => {
  try {
    const { paid_amount, payment_method, payment_terms } = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update payment information
    order.paid_amount = (paid_amount || 0).toString();
    if (payment_method) order.payment_method = payment_method;
    if (payment_terms) order.payment_terms = payment_terms;

    await order.save(); // This will trigger the pre-save middleware to recalculate totals

    res.json({
      success: true,
      data: order,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update order GST settings
export const updateOrderGST = async (req, res) => {
  try {
    const { gst_rate, gst_included } = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update GST settings
    if (gst_rate !== undefined) order.gst_rate = gst_rate.toString();
    if (gst_included !== undefined) order.gst_included = gst_included;

    await order.save(); // This will trigger the pre-save middleware to recalculate totals

    res.json({
      success: true,
      data: order,
      message: 'GST settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating GST:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Mark individual products as sold and deduct stock when order is dispatched
const markIndividualProductsAsSold = async (orderId) => {
  try {
    console.log(`🔍 Starting stock deduction for order: ${orderId}`);
    console.log(`🔍 Function called at: ${new Date().toISOString()}`);
    const orderItems = await OrderItem.find({ order_id: orderId });
    console.log(`📦 Found ${orderItems.length} order items`);
    
    for (const item of orderItems) {
      console.log(`🔄 Processing item: ${item.product_name} (${item.product_type})`);
      
      if (item.product_type === 'product') {
        // Handle product stock deduction
        if (item.selected_individual_products && item.selected_individual_products.length > 0) {
          console.log(`📋 Found ${item.selected_individual_products.length} selected individual products`);
          
          // Update individual products status to 'sold'
          const individualProductIds = item.selected_individual_products.map(ip => ip.individual_product_id);
          console.log(`🎯 Individual product IDs to update:`, individualProductIds);
          
          const updateResult = await IndividualProduct.updateMany(
            { id: { $in: individualProductIds }, status: 'available' },
            { 
              status: 'sold',
              sold_date: new Date().toISOString().split('T')[0],
              order_id: orderId
            }
          );
          
          console.log(`✅ Updated ${updateResult.modifiedCount} individual products as sold for order ${orderId}`);
        } else {
          // If no individual products selected, deduct from main product stock
          const product = await Product.findOne({ id: item.product_id });
          if (product) {
            const newStock = Math.max(0, (product.base_quantity || 0) - item.quantity);
            await Product.findOneAndUpdate(
              { id: item.product_id },
              { base_quantity: newStock }
            );
            console.log(`✅ Deducted ${item.quantity} from product ${product.name} stock (new stock: ${newStock})`);
          }
        }
      } else if (item.product_type === 'raw_material') {
        // Handle raw material stock deduction
        console.log(`🔍 Looking for raw material with ID: ${item.product_id}, Name: ${item.product_name}`);
        
        let rawMaterial;
        if (item.product_id) {
          // Try to find by ID first
          rawMaterial = await RawMaterial.findOne({ id: item.product_id });
        }
        
        if (!rawMaterial && item.product_name) {
          // If not found by ID, try to find by name
          rawMaterial = await RawMaterial.findOne({ name: item.product_name });
          console.log(`🔍 Found raw material by name: ${rawMaterial ? rawMaterial.id : 'Not found'}`);
        }
        
        if (rawMaterial) {
          const newStock = Math.max(0, (rawMaterial.current_stock || 0) - item.quantity);
          await RawMaterial.findOneAndUpdate(
            { id: rawMaterial.id },
            { current_stock: newStock }
          );
          console.log(`✅ Deducted ${item.quantity} from raw material ${rawMaterial.name} stock (new stock: ${newStock})`);
        } else {
          console.log(`❌ Raw material not found with ID: ${item.product_id} or Name: ${item.product_name}`);
        }
      }
    }
    console.log(`🎉 Stock deduction completed for order: ${orderId}`);
  } catch (error) {
    console.error('❌ Error marking individual products as sold and deducting stock:', error);
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Delete order items first
    await OrderItem.deleteMany({ order_id: order.id });

    // Delete order
    await Order.findOneAndDelete({ id: req.params.id });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Test endpoint to manually trigger stock deduction
export const testStockDeduction = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🧪 Testing stock deduction for order: ${orderId}`);
    await markIndividualProductsAsSold(orderId);
    res.json({
      success: true,
      message: `Stock deduction test completed for order ${orderId}`
    });
  } catch (error) {
    console.error('Error in test stock deduction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
