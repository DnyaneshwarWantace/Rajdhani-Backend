// Script to update material consumption records with individual product IDs
// This fixes records where individual products were consumed but IDs weren't saved

import mongoose from 'mongoose';
import MaterialConsumption from './src/models/MaterialConsumption.js';
import IndividualProduct from './src/models/IndividualProduct.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env file');
  process.exit(1);
}

async function fixMaterialConsumptionIndividualProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all material consumption records for products
    // Check for records where individual_product_ids is missing, null, or empty
    const consumptionRecords = await MaterialConsumption.find({
      material_type: 'product'
    });
    
    // Filter to only those without individual_product_ids or with empty array
    const recordsToFix = consumptionRecords.filter(record => {
      return !record.individual_product_ids || 
             record.individual_product_ids.length === 0 ||
             !Array.isArray(record.individual_product_ids);
    });
    
    console.log(`🔍 Found ${recordsToFix.length} material consumption records without individual product IDs\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const record of recordsToFix) {
      console.log(`\n📦 Processing: ${record.id}`);
      console.log(`   Material: ${record.material_name} (${record.material_id})`);
      console.log(`   Batch: ${record.production_batch_id}`);
      console.log(`   Quantity Used: ${record.quantity_used} ${record.unit}`);
      
      // Find individual products that were consumed for this product and batch
      // Look for individual products with:
      // - product_id matching material_id
      // - status = 'consumed'
      // - consumed_at around the same time as the material consumption record
      const consumedDate = new Date(record.consumed_at);
      const startDate = new Date(consumedDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
      const endDate = new Date(consumedDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after
      
      const consumedIndividualProducts = await IndividualProduct.find({
        product_id: record.material_id,
        status: 'consumed',
        consumed_at: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ consumed_at: 1 }).limit(record.quantity_used || 10);
      
      if (consumedIndividualProducts.length > 0) {
        const individualProductIds = consumedIndividualProducts.map(ip => ip.id);
        console.log(`   ✅ Found ${individualProductIds.length} consumed individual products:`);
        individualProductIds.forEach(id => console.log(`      - ${id}`));
        
        // Update the material consumption record
        record.individual_product_ids = individualProductIds;
        await record.save();
        
        console.log(`   ✅ Updated material consumption record with individual product IDs`);
        updatedCount++;
      } else {
        console.log(`   ⚠️ No consumed individual products found for this record`);
        skippedCount++;
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} records`);
    console.log(`   ⚠️ Skipped: ${skippedCount} records`);
    console.log(`   📦 Total processed: ${consumptionRecords.length} records`);
    
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
fixMaterialConsumptionIndividualProducts().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

