import mongoose from 'mongoose';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ProductionBatch from '../src/models/Production.js';
import MaterialConsumption from '../src/models/MaterialConsumption.js';
import IndividualProduct from '../src/models/IndividualProduct.js';
import { connectDB } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

async function checkBatchStatus(batchNumber) {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find batch by batch_number or id
    const batch = await ProductionBatch.findOne({
      $or: [
        { batch_number: batchNumber },
        { id: batchNumber }
      ]
    });

    if (!batch) {
      console.log(`❌ Batch ${batchNumber} not found`);
      process.exit(1);
    }

    console.log('='.repeat(80));
    console.log(`📦 BATCH INFORMATION: ${batch.batch_number}`);
    console.log('='.repeat(80));
    console.log(`ID: ${batch.id}`);
    console.log(`Product ID: ${batch.product_id}`);
    console.log(`Planned Quantity: ${batch.planned_quantity}`);
    console.log(`Actual Quantity: ${batch.actual_quantity || 0}`);
    console.log(`Status: ${batch.status}`);
    console.log(`Priority: ${batch.priority}`);
    console.log(`Created: ${batch.created_at}`);
    console.log(`Updated: ${batch.updated_at}`);
    console.log('');

    // Check stage statuses
    console.log('='.repeat(80));
    console.log('📊 STAGE STATUSES');
    console.log('='.repeat(80));
    
    console.log('\n1. Planning Stage:');
    console.log(`   Status: ${batch.planning_stage?.status || 'not_set'}`);
    console.log(`   Started: ${batch.planning_stage?.started_at || 'N/A'}`);
    console.log(`   Completed: ${batch.planning_stage?.completed_at || 'N/A'}`);
    
    console.log('\n2. Machine Stage:');
    console.log(`   Status: ${batch.machine_stage?.status || 'not_set'}`);
    console.log(`   Started: ${batch.machine_stage?.started_at || 'N/A'}`);
    console.log(`   Completed: ${batch.machine_stage?.completed_at || 'N/A'}`);
    
    console.log('\n3. Wastage Stage:');
    console.log(`   Status: ${batch.wastage_stage?.status || 'not_set'}`);
    console.log(`   Started: ${batch.wastage_stage?.started_at || 'N/A'}`);
    console.log(`   Completed: ${batch.wastage_stage?.completed_at || 'N/A'}`);
    console.log(`   Has Wastage: ${batch.wastage_stage?.has_wastage || false}`);
    
    console.log('\n4. Final Stage (Individual Products):');
    console.log(`   Status: ${batch.final_stage?.status || 'not_set'}`);
    console.log(`   Started: ${batch.final_stage?.started_at || 'N/A'}`);
    console.log(`   Completed: ${batch.final_stage?.completed_at || 'N/A'}`);
    console.log(`   Products Count: ${batch.final_stage?.products_count || 0}`);

    // Check material consumption
    console.log('\n' + '='.repeat(80));
    console.log('📦 MATERIAL CONSUMPTION');
    console.log('='.repeat(80));
    
    const consumption = await MaterialConsumption.find({
      $or: [
        { production_batch_id: batch.id },
        { production_product_id: batch.id }
      ],
      status: 'active'
    });

    console.log(`\nTotal Material Consumption Records: ${consumption.length}`);
    
    if (consumption.length > 0) {
      consumption.forEach((m, idx) => {
        console.log(`\n${idx + 1}. ${m.material_name} (${m.material_type})`);
        console.log(`   ID: ${m.id}`);
        console.log(`   Material ID: ${m.material_id}`);
        console.log(`   Quantity Used: ${m.quantity_used} ${m.unit}`);
        console.log(`   Actual Consumed: ${m.actual_consumed_quantity || m.quantity_used} ${m.unit}`);
        console.log(`   Whole Product Count: ${m.whole_product_count || 'N/A'}`);
        console.log(`   Consumption Status: ${m.consumption_status || 'not_set'}`);
        console.log(`   Individual Product IDs: ${m.individual_product_ids?.length || 0}`);
        if (m.individual_product_ids && m.individual_product_ids.length > 0) {
          console.log(`   Individual Product IDs: ${m.individual_product_ids.slice(0, 5).join(', ')}${m.individual_product_ids.length > 5 ? '...' : ''}`);
        }
        console.log(`   Consumed At: ${m.consumed_at || 'N/A'}`);
      });
    }

    // Check individual products used as materials
    console.log('\n' + '='.repeat(80));
    console.log('🔍 INDIVIDUAL PRODUCTS USED AS MATERIALS');
    console.log('='.repeat(80));
    
    const productMaterials = consumption.filter(m => m.material_type === 'product');
    if (productMaterials.length > 0) {
      for (const material of productMaterials) {
        if (material.individual_product_ids && material.individual_product_ids.length > 0) {
          console.log(`\n📦 Material: ${material.material_name}`);
          console.log(`   Individual Product IDs: ${material.individual_product_ids.length}`);
          
          const individualProducts = await IndividualProduct.find({
            id: { $in: material.individual_product_ids }
          });
          
          console.log(`   Found in DB: ${individualProducts.length}`);
          
          if (individualProducts.length > 0) {
            const statusCounts = {};
            individualProducts.forEach(ip => {
              statusCounts[ip.status] = (statusCounts[ip.status] || 0) + 1;
            });
            
            console.log(`   Status Breakdown:`);
            Object.entries(statusCounts).forEach(([status, count]) => {
              console.log(`     - ${status}: ${count}`);
            });
            
            // Show first few products
            console.log(`   Sample Products (first 5):`);
            individualProducts.slice(0, 5).forEach((ip, idx) => {
              console.log(`     ${idx + 1}. ${ip.id} - Status: ${ip.status} - Serial: ${ip.serial_number}`);
            });
          }
        }
      }
    } else {
      console.log('\nNo product-type materials found');
    }

    // Check individual products created in this batch
    console.log('\n' + '='.repeat(80));
    console.log('📦 INDIVIDUAL PRODUCTS CREATED IN THIS BATCH');
    console.log('='.repeat(80));
    
    const batchProducts = await IndividualProduct.find({
      $or: [
        { batch_number: batch.batch_number },
        { batch_number: batch.id }
      ]
    });
    
    console.log(`\nTotal Products Created: ${batchProducts.length}`);
    
    if (batchProducts.length > 0) {
      const statusCounts = {};
      batchProducts.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      
      console.log(`   Status Breakdown:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     - ${status}: ${count}`);
      });
    } else {
      console.log('   No products created yet in this batch');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Batch Status: ${batch.status}`);
    console.log(`Wastage Stage: ${batch.wastage_stage?.status || 'not_set'}`);
    console.log(`Final Stage: ${batch.final_stage?.status || 'not_set'}`);
    console.log(`Material Consumption Records: ${consumption.length}`);
    console.log(`Products Used as Materials: ${productMaterials.length}`);
    console.log(`Individual Products Created: ${batchProducts.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking batch status:', error);
    process.exit(1);
  }
}

// Get batch number from command line
const batchNumber = process.argv[2] || 'BATCH-794135';

console.log(`🔍 Checking batch status for: ${batchNumber}\n`);
checkBatchStatus(batchNumber);

