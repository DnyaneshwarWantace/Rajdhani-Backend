import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import IndividualProduct from '../models/IndividualProduct.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function checkOrderReservation() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the order
    const orderNumber = 'ON-251229-004';
    const order = await Order.findOne({ order_number: orderNumber });

    if (!order) {
      console.log(`❌ Order ${orderNumber} not found`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 ORDER DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Order ID: ${order.id}`);
    console.log(`Order Number: ${order.order_number}`);
    console.log(`Status: ${order.status}`);
    console.log(`Customer: ${order.customer_name}`);
    console.log(`Created: ${order.created_at}`);
    console.log('');

    // Find order items
    const orderItems = await OrderItem.find({ order_id: order.id });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 ORDER ITEMS (${orderItems.length} items)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      console.log(`\n${i + 1}. ${item.product_name}`);
      console.log(`   Product Type: ${item.product_type}`);
      console.log(`   Quantity: ${item.quantity} ${item.count_unit || item.unit || 'units'}`);
      console.log(`   Unit Price: ₹${item.unit_price}`);
      console.log(`   Total Price: ₹${item.total_price}`);

      if (item.selected_individual_products && item.selected_individual_products.length > 0) {
        console.log(`   ✅ Individual Products Selected: ${item.selected_individual_products.length}`);
        console.log(`   Individual Product IDs:`);
        item.selected_individual_products.forEach((product, idx) => {
          const id = product.individual_product_id || product;
          console.log(`      ${idx + 1}. ${id}`);
        });
      } else {
        console.log(`   ⚠️  No Individual Products Selected`);
      }
    }

    // Find all individual products reserved for this order
    const reservedProducts = await IndividualProduct.find({ order_id: order.id });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔒 RESERVED INDIVIDUAL PRODUCTS (${reservedProducts.length} products)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (reservedProducts.length === 0) {
      console.log('\n❌ No individual products reserved for this order');
    } else {
      for (let i = 0; i < reservedProducts.length; i++) {
        const product = reservedProducts[i];
        console.log(`\n${i + 1}. Individual Product`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Product Name: ${product.product_name}`);
        console.log(`   Product ID: ${product.product_id}`);
        console.log(`   Status: ${product.status}`);
        console.log(`   QR Code: ${product.qr_code || 'N/A'}`);
        console.log(`   Serial Number: ${product.serial_number || 'N/A'}`);
        console.log(`   Reserved At: ${product.reserved_at || 'N/A'}`);
        console.log(`   Order ID: ${product.order_id}`);

        if (product.length && product.width) {
          console.log(`   Dimensions: ${product.length}${product.length_unit} × ${product.width}${product.width_unit}`);
        }
        if (product.weight) {
          console.log(`   Weight: ${product.weight}${product.weight_unit}`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Check Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkOrderReservation();
