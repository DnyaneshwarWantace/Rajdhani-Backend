// Script to check product quantity in MongoDB database
// Run with: node check-product-quantity.js

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

async function checkProductQuantity(productId = 'PRO-251113-001') {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log(`🔍 Checking product quantity for: ${productId}\n`);
    
    // 1. Get product details
    const product = await Product.findOne({ id: productId });
    
    if (!product) {
      console.error(`❌ Product ${productId} not found in database`);
      await mongoose.disconnect();
      return;
    }
    
    console.log('📦 Product Details:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Individual Stock Tracking: ${product.individual_stock_tracking}`);
    console.log(`   Base Quantity: ${product.base_quantity || 0}`);
    console.log(`   Current Stock (in DB): ${product.current_stock || 0}`);
    console.log(`   Individual Products Count (in DB): ${product.individual_products_count || 0}`);
    
    // 2. Get individual products count
    if (product.individual_stock_tracking) {
      const allIndividualProducts = await IndividualProduct.find({ product_id: productId });
      const availableCount = await IndividualProduct.countDocuments({
        product_id: productId,
        status: 'available'
      });
      const soldCount = await IndividualProduct.countDocuments({
        product_id: productId,
        status: 'sold'
      });
      const reservedCount = await IndividualProduct.countDocuments({
        product_id: productId,
        status: 'reserved'
      });
      const damagedCount = await IndividualProduct.countDocuments({
        product_id: productId,
        status: 'damaged'
      });
      const totalCount = allIndividualProducts.length;
      
      console.log('\n📊 Individual Products Breakdown:');
      console.log(`   Total Individual Products: ${totalCount}`);
      console.log(`   Available: ${availableCount}`);
      console.log(`   Sold: ${soldCount}`);
      console.log(`   Reserved: ${reservedCount}`);
      console.log(`   Damaged: ${damagedCount}`);
      
      console.log('\n🔍 Comparison:');
      console.log(`   Database current_stock: ${product.current_stock || 0}`);
      console.log(`   Database individual_products_count: ${product.individual_products_count || 0}`);
      console.log(`   Actual available count: ${availableCount}`);
      
      if (product.current_stock !== availableCount) {
        console.log(`   ⚠️ MISMATCH: Database current_stock (${product.current_stock}) doesn't match actual available count (${availableCount})`);
      } else {
        console.log(`   ✅ Match: Database current_stock matches actual available count`);
      }
      
      if (product.individual_products_count !== availableCount) {
        console.log(`   ⚠️ MISMATCH: Database individual_products_count (${product.individual_products_count || 0}) doesn't match actual available count (${availableCount})`);
      } else {
        console.log(`   ✅ Match: Database individual_products_count matches actual available count`);
      }
      
      // Show some individual product IDs
      if (availableCount > 0) {
        const sampleProducts = await IndividualProduct.find({
          product_id: productId,
          status: 'available'
        }).limit(5).select('id status');
        
        console.log('\n📋 Sample Available Individual Products (first 5):');
        sampleProducts.forEach((ip, index) => {
          console.log(`   ${index + 1}. ${ip.id} - ${ip.status}`);
        });
      }
    } else {
      console.log('\n⚠️ Product does not use individual stock tracking');
      console.log(`   Using base_quantity: ${product.base_quantity || 0}`);
    }
    
    // 3. Check material consumption for this product
    const MaterialConsumption = mongoose.model('MaterialConsumption', new mongoose.Schema({}, { strict: false }));
    const materialConsumption = await MaterialConsumption.find({ material_id: productId })
      .sort({ consumed_at: -1 })
      .limit(5)
      .lean();
    
    if (materialConsumption && materialConsumption.length > 0) {
      console.log('\n📋 Recent Material Consumption (last 5):');
      materialConsumption.forEach((mc, index) => {
        console.log(`   ${index + 1}. Batch: ${mc.production_batch_id || 'N/A'}`);
        console.log(`      Quantity Used: ${mc.quantity_used || 0} ${mc.unit || ''}`);
        console.log(`      Individual Product IDs: ${mc.individual_product_ids?.length || 0} products`);
        if (mc.individual_product_ids && mc.individual_product_ids.length > 0) {
          console.log(`      IDs: ${mc.individual_product_ids.slice(0, 3).join(', ')}${mc.individual_product_ids.length > 3 ? '...' : ''}`);
        }
        console.log(`      Consumed At: ${mc.consumed_at ? new Date(mc.consumed_at).toLocaleString() : 'N/A'}`);
      });
    }
    
    console.log('\n✅ Check complete!\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the check
const productId = process.argv[2] || 'PRO-251113-001';
checkProductQuantity(productId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

