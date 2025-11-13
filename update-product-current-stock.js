import mongoose from 'mongoose';
import Product from './src/models/Product.js';
import IndividualProduct from './src/models/IndividualProduct.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Rajdhani';

async function updateProductCurrentStock() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the specific product
    const product = await Product.findOne({ id: 'PRO-251030-001' });
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }

    console.log(`📦 Product: ${product.name}`);
    console.log(`📊 Current base_quantity: ${product.base_quantity}`);
    console.log(`📊 Current current_stock: ${product.current_stock}`);
    console.log(`📊 Individual tracking: ${product.individual_stock_tracking}`);

    if (product.individual_stock_tracking) {
      // Count available individual products
      const availableCount = await IndividualProduct.countDocuments({
        product_id: product.id,
        status: 'available'
      });

      console.log(`📊 Available individual products: ${availableCount}`);

      // Update current_stock
      product.current_stock = availableCount;
      await product.save();

      console.log(`✅ Updated current_stock to ${availableCount}`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateProductCurrentStock();

