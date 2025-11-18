// Script to fix product quantity in MongoDB database
// Run with: node fix-product-quantity.js [productId]

import mongoose from 'mongoose';
import Product from './src/models/Product.js';
import IndividualProduct from './src/models/IndividualProduct.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env file');
  process.exit(1);
}

async function fixProductQuantity(productId = 'PRO-251113-001') {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log(`🔧 Fixing product quantity for: ${productId}\n`);
    
    // Get product
    const product = await Product.findOne({ id: productId });
    
    if (!product) {
      console.error(`❌ Product ${productId} not found in database`);
      await mongoose.disconnect();
      return;
    }
    
    console.log('📦 Product Details (Before Fix):');
    console.log(`   Name: ${product.name}`);
    console.log(`   Individual Stock Tracking: ${product.individual_stock_tracking}`);
    console.log(`   Current Stock: ${product.current_stock || 0}`);
    console.log(`   Individual Products Count: ${product.individual_products_count || 0}`);
    
    if (product.individual_stock_tracking) {
      // Count available individual products
      const availableCount = await IndividualProduct.countDocuments({
        product_id: productId,
        status: 'available'
      });
      
      console.log(`\n📊 Actual Available Individual Products: ${availableCount}`);
      
      // Update product
      product.current_stock = availableCount;
      product.individual_products_count = availableCount;
      await product.save();
      
      console.log(`\n✅ Updated product:`);
      console.log(`   Current Stock: ${product.current_stock}`);
      console.log(`   Individual Products Count: ${product.individual_products_count}`);
    } else {
      console.log('\n⚠️ Product does not use individual stock tracking, skipping fix');
    }
    
    console.log('\n✅ Fix complete!\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the fix
const productId = process.argv[2] || 'PRO-251113-001';
fixProductQuantity(productId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

