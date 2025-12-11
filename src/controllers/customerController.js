import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { generateCustomerId } from '../utils/idGenerator.js';
import { logCustomerCreate, logCustomerUpdate, logCustomerDelete } from '../utils/detailedLogger.js';
import { escapeRegex } from '../utils/regexHelper.js';

// Create a new customer
export const createCustomer = async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      id: await generateCustomerId()
    };

    // Check if customer with same email exists
    const existingCustomer = await Customer.findOne({ email: customerData.email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: 'A customer with this email already exists'
      });
    }

    const customer = new Customer({
      ...customerData,
      total_orders: 0,
      total_value: "0.00",
      outstanding_amount: "0.00",
      credit_limit: "0.00",
      status: 'new'
    });

    await customer.save();

    // Log customer creation
    await logCustomerCreate(req, customer);

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all customers with filtering
export const getCustomers = async (req, res) => {
  try {
    const { 
      search, 
      customer_type, 
      status, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = {};

    // Apply filters
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { phone: { $regex: escapedSearch, $options: 'i' } },
        { company_name: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    if (customer_type && customer_type !== 'all') {
      query.customer_type = customer_type;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const customers = await Customer.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: customers,
      count
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update customer
export const updateCustomer = async (req, res) => {
  try {
    const updateData = req.body;
    const customer = await Customer.findOne({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== customer.email) {
      const existingCustomer = await Customer.findOne({ 
        email: updateData.email,
        id: { $ne: customer.id }
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: 'A customer with this email already exists'
        });
      }
    }

    // Track changes for logging
    const changes = {};
    Object.keys(updateData).forEach(key => {
      if (customer[key] !== updateData[key]) {
        changes[key] = {
          old: customer[key],
          new: updateData[key]
        };
      }
    });

    Object.assign(customer, updateData);
    await customer.save();

    // Log customer update if there were changes
    if (Object.keys(changes).length > 0) {
      await logCustomerUpdate(req, customer, changes);
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete customer
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if customer has orders
    const orderCount = await Order.countDocuments({ customer_id: customer.id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete customer. ${orderCount} order(s) are associated with this customer.`
      });
    }

    // Log customer deletion before deleting
    await logCustomerDelete(req, customer);

    await Customer.findOneAndDelete({ id: req.params.id });

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get customer statistics
export const getCustomerStats = async (req, res) => {
  try {
    const customers = await Customer.find({});
    const orders = await Order.find({});

    const stats = {
      total_customers: customers.length,
      active_customers: customers.filter(c => c.status === 'active').length,
      new_customers: customers.filter(c => c.status === 'new').length,
      business_customers: customers.filter(c => c.customer_type === 'business').length,
      individual_customers: customers.filter(c => c.customer_type === 'individual').length,
      total_orders: orders.length,
      total_order_value: orders.reduce((sum, order) => sum + parseFloat(order.total_amount) || 0, 0),
      average_order_value: orders.length > 0 ? orders.reduce((sum, order) => sum + parseFloat(order.total_amount) || 0, 0) / orders.length : 0,
      customers_with_outstanding: customers.filter(c => parseFloat(c.outstanding_amount) > 0).length,
      total_outstanding: customers.reduce((sum, c) => sum + parseFloat(c.outstanding_amount) || 0, 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get customer orders
export const getCustomerOrders = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const orders = await Order.find({ customer_id })
      .sort({ order_date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await Order.countDocuments({ customer_id });

    res.json({
      success: true,
      data: orders,
      count
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update customer status
export const updateCustomerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const customer = await Customer.findOne({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended', 'new'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    customer.status = status;
    await customer.save();

    res.json({
      success: true,
      data: customer,
      message: `Customer status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating customer status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update customer credit limit
export const updateCreditLimit = async (req, res) => {
  try {
    const { credit_limit } = req.body;
    const customer = await Customer.findOne({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    if (credit_limit < 0) {
      return res.status(400).json({
        success: false,
        error: 'Credit limit cannot be negative'
      });
    }

    customer.credit_limit = credit_limit.toFixed(2);
    await customer.save();

    res.json({
      success: true,
      data: customer,
      message: `Credit limit updated to ${credit_limit}`
    });
  } catch (error) {
    console.error('Error updating credit limit:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
