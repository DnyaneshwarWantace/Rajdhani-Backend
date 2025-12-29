import mongoose from 'mongoose';
import Order from './src/models/Order.js';
import OrderItem from './src/models/OrderItem.js';
import IndividualProduct from './src/models/IndividualProduct.js';

async function checkOrder() {
  try {
    await mongoose.connect('mongodb://localhost:27017/rajdhani', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');

    // Find the order
    const order = await Order.findOne({ order_number: 'ON-251229-004' });

    if (!order) {
      console.log('❌ Order not found');
      process.exit(0);
    }

    console.log('\n📦 Order Details:');
    console.log('Order ID:', order.id);
    console.log('Order Number:', order.order_number);
    console.log('Status:', order.status);
    console.log('Customer:', order.customer_name);
    console.log('');

    // Find order items
    const orderItems = await OrderItem.find({ order_id: order.id });
    console.log('📋 Order Items (' + orderItems.length + '):');

    for (const item of orderItems) {
      console.log('\n  Item:', item.product_name);
      console.log('  Product Type:', item.product_type);
      console.log('  Quantity:', item.quantity);
      console.log('  Individual Products:', item.individual_products?.length || 0);

      if (item.individual_products && item.individual_products.length > 0) {
        console.log('  Individual Product IDs:', item.individual_products);
      }
    }

    // Find all individual products reserved for this order
    const reservedProducts = await IndividualProduct.find({ order_id: order.id });
    console.log('\n\n🔒 Reserved Individual Products (' + reservedProducts.length + '):');

    for (const product of reservedProducts) {
      console.log('\n  ID:', product.id);
      console.log('  Product:', product.product_name);
      console.log('  Status:', product.status);
      console.log('  Reserved At:', product.reserved_at);
      console.log('  Order ID:', product.order_id);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOrder();
