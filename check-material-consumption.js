// Script to check material consumption records
import mongoose from 'mongoose';
import MaterialConsumption from './src/models/MaterialConsumption.js';
import IndividualProduct from './src/models/IndividualProduct.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env file');
  process.exit(1);
}

async function checkMaterialConsumption() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all material consumption records
    const allRecords = await MaterialConsumption.find({}).limit(10);
    console.log(`📦 Total material consumption records: ${await MaterialConsumption.countDocuments({})}\n`);
    
    // Check records for product PRO-251113-001
    const productRecords = await MaterialConsumption.find({
      material_id: 'PRO-251113-001'
    });
    
    console.log(`\n🔍 Records for product PRO-251113-001: ${productRecords.length}`);
    productRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ID: ${record.id}`);
      console.log(`   Material: ${record.material_name} (${record.material_id})`);
      console.log(`   Material Type: ${record.material_type || 'NOT SET'}`);
      console.log(`   Batch: ${record.production_batch_id || record.production_product_id || 'N/A'}`);
      console.log(`   Quantity: ${record.quantity_used} ${record.unit}`);
      console.log(`   Individual Product IDs: ${record.individual_product_ids ? JSON.stringify(record.individual_product_ids) : 'NOT SET'}`);
      console.log(`   Consumed At: ${record.consumed_at}`);
    });
    
    // Check consumed individual products for this product
    const consumedProducts = await IndividualProduct.find({
      product_id: 'PRO-251113-001',
      status: 'consumed'
    });
    
    console.log(`\n\n📦 Consumed individual products for PRO-251113-001: ${consumedProducts.length}`);
    consumedProducts.forEach((ip, index) => {
      console.log(`   ${index + 1}. ${ip.id} - Consumed at: ${ip.consumed_at || 'N/A'}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkMaterialConsumption();

