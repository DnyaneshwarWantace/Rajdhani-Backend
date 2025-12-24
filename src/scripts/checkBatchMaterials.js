import mongoose from 'mongoose';
import { ProductionBatch } from '../models/Production.js';
import MaterialConsumption from '../models/MaterialConsumption.js';
import RawMaterial from '../models/RawMaterial.js';
import IndividualRawMaterial from '../models/IndividualRawMaterial.js';
import dotenv from 'dotenv';

dotenv.config();

const checkBatchMaterials = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const batchNumber = 'BATCH-644927';

    // 1. Find the production batch
    console.log(`🔍 Looking for batch: ${batchNumber}\n`);
    const batch = await ProductionBatch.findOne({ batch_number: batchNumber });

    if (!batch) {
      console.log(`❌ Batch ${batchNumber} not found`);
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('📦 Batch Details:');
    console.log(`   ID: ${batch.id}`);
    console.log(`   Batch Number: ${batch.batch_number}`);
    console.log(`   Product: ${batch.product_name || 'N/A'}`);
    console.log(`   Status: ${batch.status}`);
    console.log(`   Planned Quantity: ${batch.planned_quantity}`);
    console.log('');

    // 2. Find material consumption records for this batch
    console.log('🔍 Material Consumption Records:\n');
    const consumptions = await MaterialConsumption.find({
      $or: [
        { production_batch_id: batch.id },
        { production_product_id: batch.id }
      ],
      material_type: 'raw_material',
      status: 'active'
    });

    if (consumptions.length === 0) {
      console.log('   ⚠️  No material consumption records found for this batch\n');
    } else {
      console.log(`   Found ${consumptions.length} material consumption record(s):\n`);

      for (const consumption of consumptions) {
        console.log(`   📋 Material: ${consumption.material_name}`);
        console.log(`      Material ID: ${consumption.material_id}`);
        console.log(`      Quantity Used: ${consumption.quantity_used} ${consumption.unit}`);
        console.log(`      Consumption Status: ${consumption.consumption_status || 'N/A'}`);
        console.log(`      Consumed At: ${consumption.consumed_at}`);
        console.log('');

        // 3. Check RawMaterial current stock
        const rawMaterial = await RawMaterial.findOne({ id: consumption.material_id });

        if (rawMaterial) {
          console.log(`   💾 RawMaterial Record (${rawMaterial.name}):`);
          console.log(`      Current Stock: ${rawMaterial.current_stock} ${rawMaterial.unit}`);
          console.log('');

          // 4. Check IndividualRawMaterial records
          const individualMaterials = await IndividualRawMaterial.find({
            material_id: consumption.material_id
          });

          console.log(`   📊 IndividualRawMaterial Records: ${individualMaterials.length} found`);

          if (individualMaterials.length > 0) {
            // Group by status
            const statusBreakdown = individualMaterials.reduce((acc, item) => {
              acc[item.status] = (acc[item.status] || 0) + item.quantity;
              return acc;
            }, {});

            console.log('      Status Breakdown:');
            for (const [status, qty] of Object.entries(statusBreakdown)) {
              console.log(`         ${status}: ${qty} ${rawMaterial.unit}`);
            }

            // Find records for this batch
            const batchMaterials = individualMaterials.filter(
              item => item.production_batch_id === batch.id
            );

            if (batchMaterials.length > 0) {
              console.log(`\n      🎯 Records linked to this batch: ${batchMaterials.length}`);
              batchMaterials.forEach((item, idx) => {
                console.log(`         ${idx + 1}. ${item.quantity} ${item.unit} - Status: ${item.status} (ID: ${item.id})`);
              });
            }

            // Calculate available
            const available = statusBreakdown['available'] || 0;
            const inProduction = statusBreakdown['in_production'] || 0;
            const reserved = statusBreakdown['reserved'] || 0;
            const used = statusBreakdown['used'] || 0;
            const sold = statusBreakdown['sold'] || 0;
            const damaged = statusBreakdown['damaged'] || 0;

            console.log('\n      📈 Calculated Stock:');
            console.log(`         Available: ${available} ${rawMaterial.unit}`);
            console.log(`         In Production: ${inProduction} ${rawMaterial.unit}`);
            console.log(`         Reserved: ${reserved} ${rawMaterial.unit}`);
            console.log(`         Used: ${used} ${rawMaterial.unit}`);
            console.log(`         Sold: ${sold} ${rawMaterial.unit}`);
            console.log(`         Damaged: ${damaged} ${rawMaterial.unit}`);
            console.log(`         Total Tracked: ${available + inProduction + reserved + used + sold + damaged} ${rawMaterial.unit}`);
          } else {
            console.log('      ⚠️  No IndividualRawMaterial records found');
            console.log('      → Backend will show current_stock as available_stock (backward compatibility)');
          }
        } else {
          console.log(`   ❌ RawMaterial record not found for ID: ${consumption.material_id}`);
        }
        console.log('\n' + '='.repeat(80) + '\n');
      }
    }

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

checkBatchMaterials();
