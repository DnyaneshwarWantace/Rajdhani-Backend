import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import IndividualProduct from '../models/IndividualProduct.js';
import RawMaterial from '../models/RawMaterial.js';
import Notification from '../models/Notification.js';
import { generateOrderId, generateOrderNumber, generateOrderItemId } from '../utils/idGenerator.js';
import { logOrderCreate, logOrderUpdate, logOrderStatusChange, logOrderDelete } from '../utils/detailedLogger.js';
import { escapeRegex } from '../utils/regexHelper.js';

// Helper function to create notifications
const createNotification = async (data) => {
  try {
    const notificationId = `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('🔍 createNotification - related_data.created_by_user:', data.details?.created_by_user);

    const notification = new Notification({
      id: notificationId,
      type: data.type || 'info',
      title: data.title,
      message: data.message,
      priority: data.priority || 'medium',
      status: 'unread',
      module: data.module || 'orders',  // ✅ Use data.module if provided, default to 'orders'
      related_id: data.related_id,
      related_data: data.details || {},
      user_id: data.user_id,
      created_by: data.user_id,  // ✅ Add created_by field
      created_at: new Date(),
      updated_at: new Date()
    });
    await notification.save();
    console.log(`🔔 Notification created: ${data.title} | Module: ${notification.module} | Type: ${notification.type} | created_by_user: ${notification.related_data?.created_by_user}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to add activity log to order
const addActivityLog = async (order, action, description, user, details = {}) => {
  const log = {
    action,
    description,
    performed_by: user?.full_name || user?.email || 'System',
    performed_by_email: user?.email || 'system@rajdhani.com',
    timestamp: new Date(),
    details
  };

  if (!order.activity_logs) {
    order.activity_logs = [];
  }
  order.activity_logs.push(log);

  console.log(`📝 Activity Log: ${action} by ${log.performed_by}`);
};

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      id: await generateOrderId(),
      order_number: await generateOrderNumber(),
      created_by: req.user?.id || req.user?.email || 'system' // Set from authenticated user or default to 'system'
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

    // Add activity log for order creation
    await addActivityLog(
      order,
      'order_created',
      `Order ${order.order_number} created for customer ${order.customer_name}`,
      req.user,
      {
        order_number: order.order_number,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        items_count: orderData.items?.length || 0
      }
    );

    await order.save();

    // Create order items if provided
    if (orderData.items && orderData.items.length > 0) {
      for (const itemData of orderData.items) {
        console.log('========== ITEM DATA RECEIVED FROM FRONTEND ==========');
        console.log('Product:', itemData.product_name);
        console.log('Quantity:', itemData.quantity);
        console.log('Unit:', itemData.unit);
        console.log('unit_price from frontend:', itemData.unit_price);
        console.log('gst_rate from frontend:', itemData.gst_rate);
        console.log('gst_included from frontend:', itemData.gst_included);
        console.log('subtotal from frontend:', itemData.subtotal);
        console.log('gst_amount from frontend:', itemData.gst_amount);
        console.log('total_price from frontend:', itemData.total_price);
        console.log('pricing_unit from frontend:', itemData.pricing_unit);
        console.log('unit_value from frontend:', itemData.unit_value);
        console.log('product_dimensions from frontend:', itemData.product_dimensions);
        console.log('======================================================');

        const orderItem = new OrderItem({
          id: await generateOrderItemId(),
          order_id: order.id,
          product_id: itemData.product_id || null,
          raw_material_id: itemData.raw_material_id || null,
          individual_product_id: itemData.individual_product_id || null,
          product_name: itemData.product_name,
          product_type: itemData.product_type || 'product',
          quantity: itemData.quantity,
          unit: itemData.unit,
          unit_price: itemData.unit_price.toString(),
          // Per-item GST fields
          gst_rate: itemData.gst_rate ? itemData.gst_rate.toString() : "18.00",
          gst_included: itemData.gst_included !== undefined ? itemData.gst_included : true,
          // Accept frontend-calculated prices (frontend already calculated based on pricing unit)
          subtotal: itemData.subtotal ? itemData.subtotal.toString() : "0.00",
          gst_amount: itemData.gst_amount ? itemData.gst_amount.toString() : "0.00",
          total_price: itemData.total_price ? itemData.total_price.toString() : "0.00",
          quality_grade: itemData.quality_grade || 'A',
          specifications: itemData.specifications || null,
          selected_individual_products: itemData.selected_individual_products || [],
          // Store additional pricing info if provided
          pricing_unit: itemData.pricing_unit || null,
          unit_value: itemData.unit_value || null,
          product_dimensions: itemData.product_dimensions || null
        });
        await orderItem.save();

        // Reserve individual products if selected
        if (itemData.selected_individual_products && itemData.selected_individual_products.length > 0) {
          const individualProductIds = itemData.selected_individual_products.map(ip => ip.individual_product_id);
          await IndividualProduct.updateMany(
            { id: { $in: individualProductIds } },
            {
              status: 'reserved',
              order_id: order.id
            }
          );
          console.log(`✅ Reserved ${individualProductIds.length} individual products for order ${order.id}`);
        }

        // Reserve raw material stock if product_type is 'raw_material'
        if (itemData.product_type === 'raw_material' && itemData.raw_material_id) {
          const rawMaterial = await RawMaterial.findOne({ id: itemData.raw_material_id });
          if (rawMaterial) {
            const reservedStock = (rawMaterial.reserved_stock || 0) + itemData.quantity;
            await RawMaterial.findOneAndUpdate(
              { id: itemData.raw_material_id },
              { reserved_stock: reservedStock }
            );
            console.log(`✅ Reserved ${itemData.quantity} ${itemData.unit} of ${rawMaterial.name} for order ${order.id}`);
          }
        }
      }

      // Calculate order totals from items (items already have GST included in total_price from frontend)
      const items = await OrderItem.find({ order_id: order.id });

      // Sum up all item total prices (already includes GST calculated by frontend based on pricing unit)
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

      const discountAmount = parseFloat(order.discount_amount) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;

      // Calculate final total with discount
      const finalTotal = totalAmount - discountAmount;

      // Calculate outstanding amount
      const outstandingAmount = finalTotal - paidAmount;

      // Update order with calculated values
      await Order.findOneAndUpdate(
        { id: order.id },
        {
          subtotal: totalAmount.toFixed(2),
          gst_amount: '0.00', // GST already included in item total_price
          total_amount: finalTotal.toFixed(2),
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

    // Fetch the updated order with final values
    const finalOrder = await Order.findOne({ id: order.id });

    // Add activity log for order creation
    await addActivityLog(
      finalOrder,
      'order_created',
      `Order ${finalOrder.order_number} created for ${finalOrder.customer_name} with ${orderData.items?.length || 0} items`,
      req.user,
      {
        order_number: finalOrder.order_number,
        customer_name: finalOrder.customer_name,
        total_amount: finalOrder.total_amount,
        items_count: orderData.items?.length || 0,
        status: finalOrder.status
      }
    );
    await finalOrder.save();

    // Log order creation with details
    await logOrderCreate(req, finalOrder);

    // Create detailed notifications for each product and material in the order
    for (const itemData of orderData.items || []) {
      const isProduct = itemData.product_type === 'product';
      const isMaterial = itemData.product_type === 'raw_material';

      // Build detailed item information
      let itemDetails = {
        name: itemData.product_name,
        quantity: itemData.quantity,
        unit: itemData.unit,
        unit_price: parseFloat(itemData.unit_price || 0),
        total_price: parseFloat(itemData.total_price || 0),
        pricing_unit: itemData.pricing_unit,
        unit_value: itemData.unit_value
      };

      // Get additional product/material details from database
      if (isProduct && itemData.product_id) {
        const product = await Product.findOne({ id: itemData.product_id });
        if (product) {
          itemDetails = {
            ...itemDetails,
            color: product.color,
            pattern: product.pattern,
            category: product.category,
            subcategory: product.subcategory,
            width: product.width,
            length: product.length,
            weight: product.weight,
            width_unit: product.width_unit,
            length_unit: product.length_unit,
            weight_unit: product.weight_unit,
            sqm_per_piece: product.sqm_per_piece,
            current_stock: product.current_stock
          };
        }
      } else if (isMaterial && itemData.raw_material_id) {
        const material = await RawMaterial.findOne({ id: itemData.raw_material_id });
        if (material) {
          itemDetails = {
            ...itemDetails,
            color: material.color,
            category: material.category,
            subcategory: material.subcategory,
            supplier: material.supplier,
            width: material.width,
            length: material.length,
            weight: material.weight,
            width_unit: material.width_unit,
            length_unit: material.length_unit,
            weight_unit: material.weight_unit,
            current_stock: material.current_stock
          };
        }
      }

      // Create notification for products
      if (isProduct) {
        // Get product details to check stock
        const product = await Product.findOne({ id: itemData.product_id });
        const availableStock = product?.current_stock || 0;
        const requiredQuantity = itemData.quantity;
        const shortfall = Math.max(0, requiredQuantity - availableStock);
        const isStockInsufficient = availableStock < requiredQuantity;

        console.log('🔍 Creating notification with user data:', {
          user_id: req.user?.id,
          email: req.user?.email,
          full_name: req.user?.full_name,
          role: req.user?.role
        });

        await createNotification({
          type: isStockInsufficient ? 'production_request' : 'order_alert',
          title: isStockInsufficient
            ? `Product Stock Alert - ${itemData.product_name}`
            : `Order ${finalOrder.order_number} - ${itemData.product_name}`,
          message: isStockInsufficient
            ? `Order ${finalOrder.order_number} requires ${requiredQuantity} ${itemData.unit} of ${itemData.product_name}. Current stock: ${availableStock} ${itemData.unit}. Need to produce ${shortfall} more ${itemData.unit}.`
            : `New order from ${finalOrder.customer_name} requires ${requiredQuantity} ${itemData.unit} of ${itemData.product_name}. Price: ₹${parseFloat(itemData.total_price || 0).toLocaleString()}`,
          user_id: req.user?.id || req.user?.email,
          related_id: itemData.product_id,
          module: 'products',
          priority: isStockInsufficient ? 'high' : (itemData.quantity > 10 ? 'high' : 'medium'),
          details: {
            order_id: finalOrder.id,
            order_number: finalOrder.order_number,
            customer_name: finalOrder.customer_name,
            customer_email: finalOrder.customer_email,
            customer_phone: finalOrder.customer_phone,
            order_date: finalOrder.order_date,
            expected_delivery: finalOrder.expected_delivery,
            product_id: itemData.product_id,
            product_name: itemData.product_name,
            product_details: itemDetails,
            quantity_ordered: requiredQuantity,
            available_stock: availableStock,
            shortfall: shortfall,
            unit: itemData.unit,
            quality_grade: itemData.quality_grade,
            specifications: itemData.specifications,
            pricing_unit: itemData.pricing_unit,
            unit_value: itemData.unit_value,
            unit_price: parseFloat(itemData.unit_price || 0),
            gst_rate: parseFloat(itemData.gst_rate || '18'),
            gst_included: itemData.gst_included,
            subtotal: parseFloat(itemData.subtotal || '0'),
            gst_amount: parseFloat(itemData.gst_amount || '0'),
            total_price: parseFloat(itemData.total_price || '0'),
            selected_individual_products: itemData.selected_individual_products || [],
            created_by_user: req.user?.full_name || req.user?.email || 'Unknown User'
          }
        });
      }

      // Create notification for materials
      if (isMaterial) {
        // Get material details to check stock
        const material = await RawMaterial.findOne({ id: itemData.raw_material_id || itemData.product_id });
        const availableStock = material?.current_stock || 0;
        const requiredQuantity = itemData.quantity;
        const shortfall = Math.max(0, requiredQuantity - availableStock);
        const isStockInsufficient = availableStock < requiredQuantity;

        await createNotification({
          type: isStockInsufficient ? 'restock_request' : 'order_alert',
          title: isStockInsufficient
            ? `Raw Material Stock Alert - ${itemData.product_name}`
            : `Order ${finalOrder.order_number} - ${itemData.product_name}`,
          message: isStockInsufficient
            ? `Order ${finalOrder.order_number} requires ${requiredQuantity} ${itemData.unit} of ${itemData.product_name}. Current stock: ${availableStock} ${itemData.unit}. Need to restock ${shortfall} more ${itemData.unit}.`
            : `New order from ${finalOrder.customer_name} requires ${requiredQuantity} ${itemData.unit} of ${itemData.product_name}. Price: ₹${parseFloat(itemData.total_price || 0).toLocaleString()}`,
          user_id: req.user?.id || req.user?.email,
          related_id: itemData.raw_material_id || itemData.product_id,
          module: 'materials',
          priority: isStockInsufficient ? 'high' : (itemData.quantity > 100 ? 'high' : 'medium'),
          details: {
            order_id: finalOrder.id,
            order_number: finalOrder.order_number,
            customer_name: finalOrder.customer_name,
            customer_email: finalOrder.customer_email,
            customer_phone: finalOrder.customer_phone,
            order_date: finalOrder.order_date,
            expected_delivery: finalOrder.expected_delivery,
            material_id: itemData.raw_material_id || itemData.product_id,
            material_name: itemData.product_name,
            material_details: itemDetails,
            quantity_ordered: requiredQuantity,
            available_stock: availableStock,
            shortfall: shortfall,
            unit: itemData.unit,
            specifications: itemData.specifications,
            pricing_unit: itemData.pricing_unit,
            unit_value: itemData.unit_value,
            unit_price: parseFloat(itemData.unit_price || 0),
            gst_rate: parseFloat(itemData.gst_rate || '18'),
            created_by_user: req.user?.full_name || req.user?.email || 'Unknown User',
            gst_included: itemData.gst_included,
            subtotal: parseFloat(itemData.subtotal || '0'),
            gst_amount: parseFloat(itemData.gst_amount || '0'),
            total_price: parseFloat(itemData.total_price || '0')
          }
        });
      }
    }

    // Create general order notification for orders module
    await createNotification({
      type: 'success',
      title: `New Order Created: ${finalOrder.order_number}`,
      message: `Order for ${finalOrder.customer_name} - ${orderData.items?.length || 0} items - Total: ₹${parseFloat(finalOrder.total_amount || 0).toLocaleString()}`,
      user_id: req.user?.id || req.user?.email,
      related_id: finalOrder.id,
      module: 'orders',
      priority: 'medium',
      details: {
        order_number: finalOrder.order_number,
        customer_name: finalOrder.customer_name,
        customer_email: finalOrder.customer_email,
        customer_phone: finalOrder.customer_phone,
        items_count: orderData.items?.length || 0,
        total_amount: parseFloat(finalOrder.total_amount || 0),
        paid_amount: parseFloat(finalOrder.paid_amount || 0),
        outstanding_amount: parseFloat(finalOrder.outstanding_amount || 0),
        expected_delivery: finalOrder.expected_delivery,
        order_date: finalOrder.order_date
      }
    });

    res.status(201).json({
      success: true,
      data: finalOrder
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
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { order_number: { $regex: escapedSearch, $options: 'i' } },
        { customer_name: { $regex: escapedSearch, $options: 'i' } },
        { customer_email: { $regex: escapedSearch, $options: 'i' } }
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

    // Populate order items for each order with product details
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        const items = await OrderItem.find({ order_id: order.id });

        // Enhance items with product/material details (color, pattern, dimensions, etc.)
        const enhancedItems = await Promise.all(items.map(async (item) => {
          const itemObj = item.toObject();

          // Fetch product or raw material details
          if (item.product_type === 'raw_material' && item.raw_material_id) {
            const material = await RawMaterial.findOne({ id: item.raw_material_id });
            if (material) {
              itemObj.color = material.color;
              itemObj.length = material.length;
              itemObj.width = material.width;
              itemObj.length_unit = material.length_unit;
              itemObj.width_unit = material.width_unit;
              itemObj.weight = material.weight;
              itemObj.weight_unit = material.weight_unit;
            }
          } else if (item.product_id) {
            const product = await Product.findOne({ id: item.product_id });
            if (product) {
              itemObj.color = product.color;
              itemObj.pattern = product.pattern;
              itemObj.length = product.length;
              itemObj.width = product.width;
              itemObj.length_unit = product.length_unit;
              itemObj.width_unit = product.width_unit;
              itemObj.weight = product.weight;
              itemObj.weight_unit = product.weight_unit;
            }
          }

          return itemObj;
        }));

        orderObj.order_items = enhancedItems;
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

    // Enhance items with full product/material details
    const enhancedItems = await Promise.all(orderItems.map(async (item) => {
      console.log('📦 Order Item from DB:', {
        id: item.id,
        product_name: item.product_name,
        product_id: item.product_id,
        raw_material_id: item.raw_material_id,
        product_type: item.product_type
      });

      let productDetails = null;

      // Fetch product or raw material details
      if (item.product_type === 'raw_material' && item.raw_material_id) {
        const material = await RawMaterial.findOne({ id: item.raw_material_id });
        if (material) {
          productDetails = {
            color: material.color,
            category: material.category,
            subcategory: material.subcategory,
            weight: material.weight,
            width: material.width,
            length: material.length,
            supplier: material.supplier
          };
        }
      } else if (item.product_id) {
        const product = await Product.findOne({ id: item.product_id });
        if (product) {
          productDetails = {
            color: product.color,
            pattern: product.pattern,
            category: product.category,
            subcategory: product.subcategory,
            weight: product.weight,
            width: product.width,
            length: product.length,
            sqm_per_piece: product.sqm_per_piece,
            width_unit: product.width_unit,
            length_unit: product.length_unit
          };
        }
      }

      return {
        ...item.toObject(),
        product_details: productDetails
      };
    }));

    res.json({
      success: true,
      data: {
        order,
        items: enhancedItems
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

    // Track changes for logging
    const changes = {};
    Object.keys(updateData).forEach(key => {
      if (order[key] !== updateData[key]) {
        changes[key] = {
          old: order[key],
          new: updateData[key]
        };
      }
    });

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

    // Add activity log for status changes
    if (changes.status) {
      const statusMessages = {
        'accepted': `Order accepted`,
        'dispatched': `Order dispatched - products marked as sold`,
        'delivered': `Order delivered to customer`,
        'cancelled': `Order cancelled`
      };

      await addActivityLog(
        order,
        `order_${order.status}`,
        statusMessages[order.status] || `Status changed from ${oldStatus} to ${order.status}`,
        req.user,
        {
          old_status: oldStatus,
          new_status: order.status,
          order_number: order.order_number
        }
      );

      // Create notification for status change
      await createNotification({
        type: order.status === 'cancelled' ? 'warning' : 'success',
        title: `Order ${order.order_number} - ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`,
        message: statusMessages[order.status] || `Status changed to ${order.status}`,
        user_id: req.user?.id || req.user?.email,
        related_id: order.id,
        priority: order.status === 'cancelled' ? 'high' : 'medium'
      });
    }

    await order.save();

    // Log order update with changes
    if (Object.keys(changes).length > 0) {
      // If status changed, log status change specifically
      if (changes.status) {
        await logOrderStatusChange(req, order, oldStatus, order.status);
      } else {
        await logOrderUpdate(req, order, changes);
      }
    }

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

    // Store old status for logging
    const oldStatus = order.status;

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
      case 'cancelled':
        // Release all reserved stock when order is cancelled
        console.log(`🚫 Order ${order.id} cancelled, releasing reserved stock`);
        await releaseReservedStock(order.id);
        break;
    }

    // Add activity log for status change
    const statusDescriptions = {
      'accepted': `Order accepted and ready for product selection`,
      'dispatched': `Order dispatched - products marked as sold`,
      'delivered': `Order delivered to customer`,
      'cancelled': `Order cancelled - reserved stock released`
    };

    await addActivityLog(
      order,
      `order_${status}`,
      statusDescriptions[status] || `Order status changed from ${oldStatus} to ${status}`,
      req.user,
      {
        old_status: oldStatus,
        new_status: status,
        order_number: order.order_number
      }
    );

    await order.save();

    // Log status change
    await logOrderStatusChange(req, order, oldStatus, status);

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
    const { paid_amount, payment_method, payment_terms, notes } = req.body;
    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const previousPaidAmount = parseFloat(order.paid_amount || '0');
    const newPaidAmount = parseFloat(paid_amount || '0');

    // Track payment change in history
    if (previousPaidAmount !== newPaidAmount) {
      const paymentChange = {
        amount: newPaidAmount - previousPaidAmount,
        previous_paid_amount: previousPaidAmount,
        new_paid_amount: newPaidAmount,
        changed_by: req.user?.full_name || req.user?.email || 'Unknown',
        changed_by_email: req.user?.email || 'unknown@email.com',
        changed_at: new Date(),
        notes: notes || `Payment updated from ${previousPaidAmount} to ${newPaidAmount}`
      };

      if (!order.payment_history) {
        order.payment_history = [];
      }
      order.payment_history.push(paymentChange);

      console.log('💰 Payment changed by:', paymentChange.changed_by);
      console.log('💰 Previous amount:', previousPaidAmount);
      console.log('💰 New amount:', newPaidAmount);

      // Add activity log for payment update
      await addActivityLog(
        order,
        'payment_updated',
        `Payment updated: ₹${previousPaidAmount.toLocaleString()} → ₹${newPaidAmount.toLocaleString()}`,
        req.user,
        {
          previous_amount: previousPaidAmount,
          new_amount: newPaidAmount,
          difference: newPaidAmount - previousPaidAmount,
          outstanding: parseFloat(order.total_amount) - newPaidAmount
        }
      );
    }

    // Update payment information
    order.paid_amount = newPaidAmount.toString();
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

          // Update products with status 'available' OR 'reserved' to 'sold'
          const updateResult = await IndividualProduct.updateMany(
            { id: { $in: individualProductIds }, status: { $in: ['available', 'reserved'] } },
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

    // Release reserved individual products and raw materials before deleting
    await releaseReservedStock(order.id);

    // Delete order items first
    await OrderItem.deleteMany({ order_id: order.id });

    // Delete order
    await Order.findOneAndDelete({ id: req.params.id });

    // Log order deletion
    await logOrderDelete(req, order);

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

// Helper function to release reserved stock
const releaseReservedStock = async (orderId) => {
  try {
    console.log(`🔓 Releasing reserved stock for order: ${orderId}`);
    const orderItems = await OrderItem.find({ order_id: orderId });

    for (const item of orderItems) {
      // Release individual products
      if (item.selected_individual_products && item.selected_individual_products.length > 0) {
        const individualProductIds = item.selected_individual_products.map(ip => ip.individual_product_id);
        await IndividualProduct.updateMany(
          { id: { $in: individualProductIds }, status: 'reserved', order_id: orderId },
          {
            status: 'available',
            $unset: { order_id: "" }
          }
        );
        console.log(`✅ Released ${individualProductIds.length} individual products`);
      }

      // Release raw material stock
      if (item.product_type === 'raw_material' && item.raw_material_id) {
        const rawMaterial = await RawMaterial.findOne({ id: item.raw_material_id });
        if (rawMaterial) {
          const newReservedStock = Math.max(0, (rawMaterial.reserved_stock || 0) - item.quantity);
          await RawMaterial.findOneAndUpdate(
            { id: item.raw_material_id },
            { reserved_stock: newReservedStock }
          );
          console.log(`✅ Released ${item.quantity} ${item.unit} of ${rawMaterial.name}`);
        }
      }
    }
    console.log(`🎉 Stock release completed for order: ${orderId}`);
  } catch (error) {
    console.error('❌ Error releasing reserved stock:', error);
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

// Save individual product selection for an order item
export const saveIndividualProductSelection = async (req, res) => {
  try {
    const { orderItemId, individualProductIds } = req.body;

    if (!orderItemId || !individualProductIds) {
      return res.status(400).json({
        success: false,
        error: 'Order item ID and individual product IDs are required'
      });
    }

    // Find the order item
    const orderItem = await OrderItem.findOne({ id: orderItemId });
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        error: 'Order item not found'
      });
    }

    // Get previously selected products (to unreserve them)
    const previouslySelected = orderItem.selected_individual_products || [];
    const previouslySelectedIds = previouslySelected.map(p => p.individual_product_id || p);

    // Unreserve previously selected products that are no longer selected
    const toUnreserve = previouslySelectedIds.filter(id => !individualProductIds.includes(id));
    if (toUnreserve.length > 0) {
      await IndividualProduct.updateMany(
        { id: { $in: toUnreserve } },
        { $set: { status: 'available', order_id: null } }
      );
      console.log(`✅ Unreserved ${toUnreserve.length} products:`, toUnreserve);
    }

    // Reserve newly selected products
    const toReserve = individualProductIds.filter(id => !previouslySelected.map(p => p.individual_product_id || p).includes(id));
    if (toReserve.length > 0) {
      await IndividualProduct.updateMany(
        { id: { $in: toReserve } },
        { $set: { status: 'reserved', order_id: orderItem.order_id } }
      );
      console.log(`✅ Reserved ${toReserve.length} products:`, toReserve);
    }

    // Fetch the full individual product details
    const individualProducts = await IndividualProduct.find({ id: { $in: individualProductIds } });

    // Update order item with selected products in the correct format
    orderItem.selected_individual_products = individualProducts.map(ip => ({
      individual_product_id: ip.id,
      qr_code: ip.qr_code,
      serial_number: ip.serial_number
    }));
    await orderItem.save();

    // Add activity log to order
    const order = await Order.findOne({ id: orderItem.order_id });
    if (order) {
      const action = previouslySelected.length > 0 ? 'individual_products_changed' : 'individual_products_selected';
      const description = previouslySelected.length > 0
        ? `Individual products updated for ${orderItem.product_name}: ${previouslySelected.length} → ${individualProductIds.length} products`
        : `${individualProductIds.length} individual products selected for ${orderItem.product_name}`;

      // Fetch individual product details for logging
      const selectedIndividualProducts = await IndividualProduct.find({ id: { $in: individualProductIds } });
      const productDetails = selectedIndividualProducts.map(ip => ({
        id: ip.id,
        qr_code: ip.qr_code,
        serial_number: ip.serial_number
      }));

      await addActivityLog(
        order,
        action,
        description,
        req.user,
        {
          product_name: orderItem.product_name,
          product_id: orderItem.product_id,
          selected_count: individualProductIds.length,
          required_count: orderItem.quantity,
          previously_selected_count: previouslySelected.length,
          reserved_count: toReserve.length,
          unreserved_count: toUnreserve.length,
          individual_products: productDetails,
          individual_product_ids: individualProductIds
        }
      );

      await order.save();
    }

    res.json({
      success: true,
      message: 'Individual product selection saved successfully',
      data: {
        orderItemId,
        selectedCount: individualProductIds.length,
        requiredCount: orderItem.quantity
      }
    });
  } catch (error) {
    console.error('Error saving individual product selection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save individual product selection'
    });
  }
};
