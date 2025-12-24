import mongoose from 'mongoose';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ProductionBatch from '../src/models/Production.js';
import MaterialConsumption from '../src/models/MaterialConsumption.js';
import { connectDB } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

async function fixBatchStageStatuses(batchNumber = null) {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Build query
    const query = batchNumber 
      ? { $or: [{ batch_number: batchNumber }, { id: batchNumber }] }
      : { status: { $in: ['in_production', 'in_progress'] } };

    // Find batches
    const batches = await ProductionBatch.find(query);

    if (batches.length === 0) {
      console.log(`❌ No batches found${batchNumber ? ` for ${batchNumber}` : ''}`);
      process.exit(1);
    }

    console.log(`📦 Found ${batches.length} batch(es) to check\n`);

    for (const batch of batches) {
      console.log('='.repeat(80));
      console.log(`📦 Processing Batch: ${batch.batch_number} (${batch.id})`);
      console.log('='.repeat(80));

      let needsUpdate = false;
      const updates = {};

      // Check planning_stage
      const hasMaterialConsumption = await MaterialConsumption.exists({
        $or: [
          { production_batch_id: batch.id },
          { production_product_id: batch.id }
        ],
        status: 'active'
      });

      if (hasMaterialConsumption && batch.planning_stage?.status !== 'completed') {
        console.log('  ✅ Planning stage should be completed (has material consumption)');
        updates['planning_stage.status'] = 'completed';
        if (!batch.planning_stage?.completed_at) {
          updates['planning_stage.completed_at'] = batch.start_date || batch.created_at || new Date();
        }
        if (!batch.planning_stage?.completed_by) {
          updates['planning_stage.completed_by'] = batch.operator || batch.supervisor || 'System';
        }
        needsUpdate = true;
      }

      // Check machine_stage
      // If wastage_stage is completed or in_progress, machine_stage should be completed
      if ((batch.wastage_stage?.status === 'completed' || batch.wastage_stage?.status === 'in_progress') 
          && batch.machine_stage?.status !== 'completed') {
        console.log('  ✅ Machine stage should be completed (wastage stage is active/completed)');
        updates['machine_stage.status'] = 'completed';
        if (!batch.machine_stage?.completed_at) {
          // Use wastage_stage started_at or start_date as completion time
          updates['machine_stage.completed_at'] = batch.wastage_stage?.started_at || batch.start_date || new Date();
        }
        if (!batch.machine_stage?.completed_by) {
          updates['machine_stage.completed_by'] = batch.wastage_stage?.started_by || batch.operator || 'System';
        }
        // Also set started_at if not set
        if (!batch.machine_stage?.started_at) {
          updates['machine_stage.started_at'] = batch.start_date || batch.created_at || new Date();
        }
        if (!batch.machine_stage?.started_by) {
          updates['machine_stage.started_by'] = batch.operator || batch.supervisor || 'System';
        }
        needsUpdate = true;
      }

      // Check final_stage
      // If wastage_stage is completed, final_stage should be in_progress
      if (batch.wastage_stage?.status === 'completed' && batch.final_stage?.status !== 'in_progress' && batch.final_stage?.status !== 'completed') {
        console.log('  ✅ Final stage should be in_progress (wastage stage is completed)');
        updates['final_stage.status'] = 'in_progress';
        if (!batch.final_stage?.started_at) {
          updates['final_stage.started_at'] = batch.wastage_stage?.completed_at || new Date();
        }
        if (!batch.final_stage?.started_by) {
          updates['final_stage.started_by'] = batch.wastage_stage?.completed_by || batch.operator || 'System';
        }
        needsUpdate = true;
      }

      // Apply updates
      if (needsUpdate) {
        console.log('\n  🔄 Applying updates...');
        const updated = await ProductionBatch.findOneAndUpdate(
          { id: batch.id },
          { $set: updates },
          { new: true }
        );

        if (updated) {
          console.log('  ✅ Batch updated successfully');
          console.log('  📊 Updated fields:');
          Object.keys(updates).forEach(key => {
            console.log(`     - ${key}: ${updates[key]}`);
          });
        } else {
          console.log('  ❌ Failed to update batch');
        }
      } else {
        console.log('  ✅ Batch stage statuses are correct - no updates needed');
      }

      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ Finished processing batches');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing batch stage statuses:', error);
    process.exit(1);
  }
}

// Get batch number from command line
const batchNumber = process.argv[2] || null;

if (batchNumber) {
  console.log(`🔍 Fixing stage statuses for batch: ${batchNumber}\n`);
} else {
  console.log('🔍 Fixing stage statuses for all in_production batches\n');
}

fixBatchStageStatuses(batchNumber);

