import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import IndividualProduct from '../models/IndividualProduct.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function deleteAllOrders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all orders first
    const orders = await Order.find({});
    console.log(`📊 Found ${orders.length} orders to delete`);

    // Release all reserved individual products
    console.log('🔓 Releasing all reserved individual products...');
    const releaseResult = await IndividualProduct.updateMany(
      { status: 'reserved' },
      {
        status: 'available',
        order_id: null,
        $unset: { reserved_at: 1 }
      }
    );
    console.log(`✅ Released ${releaseResult.modifiedCount} reserved products`);

    // Delete all order items
    console.log('🗑️  Deleting all order items...');
    const itemsResult = await OrderItem.deleteMany({});
    console.log(`✅ Deleted ${itemsResult.deletedCount} order items`);

    // Delete all orders
    console.log('🗑️  Deleting all orders...');
    const ordersResult = await Order.deleteMany({});
    console.log(`✅ Deleted ${ordersResult.deletedCount} orders`);

    console.log('\n✅ All orders deleted successfully!');
    console.log('📊 Summary:');
    console.log(`   - Orders deleted: ${ordersResult.deletedCount}`);
    console.log(`   - Order items deleted: ${itemsResult.deletedCount}`);
    console.log(`   - Individual products released: ${releaseResult.modifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting orders:', error);
    process.exit(1);
  }
}

deleteAllOrders();
