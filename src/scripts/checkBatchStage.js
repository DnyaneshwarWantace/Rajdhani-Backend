import mongoose from 'mongoose';
import { ProductionBatch as Batch, ProductionFlow as Flow, ProductionFlowStep as FlowStep } from '../models/Production.js';
import MaterialConsumption from '../models/MaterialConsumption.js';
import PlanningDraftState from '../models/PlanningDraftState.js';
import ProductionWaste from '../models/ProductionWaste.js';
import { connectDB } from '../config/database.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function checkBatchStage(batchNumber) {
  try {
    // Connect to MongoDB using the database config
    console.log(`🔌 Connecting to MongoDB...`);
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find batch by batch_number
    console.log(`🔍 Searching for batch: ${batchNumber}...\n`);
    const batch = await Batch.findOne({ batch_number: batchNumber });
    
    if (!batch) {
      console.log(`❌ Batch ${batchNumber} not found in database`);
      await mongoose.disconnect();
      return;
    }

    console.log('📦 BATCH INFORMATION:');
    console.log('='.repeat(60));
    console.log(`Batch ID: ${batch.id}`);
    console.log(`Batch Number: ${batch.batch_number}`);
    console.log(`Product ID: ${batch.product_id}`);
    console.log(`Status: ${batch.status}`);
    console.log(`Priority: ${batch.priority}`);
    console.log(`Planned Quantity: ${batch.planned_quantity}`);
    console.log(`Actual Quantity: ${batch.actual_quantity || 0}`);
    console.log(`Created: ${batch.created_at}`);
    console.log(`Updated: ${batch.updated_at}`);
    
    // Show wastage_stage information
    if (batch.wastage_stage) {
      console.log('\n🗑️  WASTAGE STAGE (from batch):');
      console.log(`   Status: ${batch.wastage_stage.status || 'not_set'}`);
      console.log(`   Started At: ${batch.wastage_stage.started_at || 'N/A'}`);
      console.log(`   Started By: ${batch.wastage_stage.started_by || 'N/A'}`);
      console.log(`   Completed At: ${batch.wastage_stage.completed_at || 'N/A'}`);
      console.log(`   Completed By: ${batch.wastage_stage.completed_by || 'N/A'}`);
      console.log(`   Has Wastage: ${batch.wastage_stage.has_wastage || false}`);
    } else {
      console.log('\n🗑️  WASTAGE STAGE: Not set in batch document');
    }
    console.log('');

    // Check PlanningDraftState
    const draftState = await PlanningDraftState.findOne({ 
      product_id: batch.product_id 
    });
    
    console.log('📋 PLANNING STAGE:');
    console.log('='.repeat(60));
    if (draftState) {
      console.log('✅ Planning draft state exists');
      console.log(`   Consumed Materials: ${draftState.consumed_materials?.length || 0}`);
      console.log(`   Materials in Requirements: ${draftState.materials?.length || 0}`);
    } else {
      console.log('❌ No planning draft state found');
    }
    console.log('');

    // Check Material Consumption
    const materialConsumption = await MaterialConsumption.find({ 
      production_batch_id: batch.id 
    });
    
    console.log('🔧 MATERIAL CONSUMPTION:');
    console.log('='.repeat(60));
    if (materialConsumption.length > 0) {
      console.log(`✅ ${materialConsumption.length} material consumption record(s) found`);
      materialConsumption.forEach((mc, idx) => {
        console.log(`   ${idx + 1}. ${mc.material_name} (${mc.material_type}): ${mc.quantity_used} ${mc.unit}`);
        if (mc.individual_product_ids && mc.individual_product_ids.length > 0) {
          console.log(`      Individual Products: ${mc.individual_product_ids.length} selected`);
        }
      });
    } else {
      console.log('❌ No material consumption records found');
    }
    console.log('');

    // Check Production Flow
    const flow = await Flow.findOne({ 
      production_product_id: batch.id 
    });
    
    console.log('⚙️ PRODUCTION FLOW:');
    console.log('='.repeat(60));
    if (flow) {
      console.log(`✅ Production flow exists (ID: ${flow.id})`);
      console.log(`   Flow Status: ${flow.status}`);
      console.log(`   Current Step: ${flow.current_step}`);
      
      // Check Flow Steps
      const flowSteps = await FlowStep.find({ flow_id: flow.id });
      console.log(`   Total Steps: ${flowSteps.length}`);
      
      if (flowSteps.length > 0) {
        console.log('\n   Flow Steps:');
        flowSteps.forEach((step, idx) => {
          console.log(`   ${idx + 1}. ${step.step_name} (${step.step_type}) - Status: ${step.status}`);
          if (step.start_time) console.log(`      Started: ${step.start_time}`);
          if (step.end_time) console.log(`      Completed: ${step.end_time}`);
        });
      }
    } else {
      console.log('❌ No production flow found');
    }
    console.log('');

    // Check Production Waste
    const waste = await ProductionWaste.find({ 
      production_batch_id: batch.id 
    });
    
    console.log('🗑️ WASTAGE STAGE:');
    console.log('='.repeat(60));
    if (waste.length > 0) {
      console.log(`✅ ${waste.length} waste record(s) found`);
      waste.forEach((w, idx) => {
        console.log(`   ${idx + 1}. ${w.waste_type}: ${w.quantity} ${w.unit} - Status: ${w.status}`);
      });
    } else {
      console.log('❌ No waste records found');
    }
    console.log('');

    // Determine Current Stage
    console.log('🎯 CURRENT STAGE DETERMINATION:');
    console.log('='.repeat(60));
    
    let currentStage = 'planning';
    
    if (materialConsumption.length > 0) {
      currentStage = 'machine'; // Materials consumed, moved to machine stage
      
      if (flow) {
        const flowSteps = await FlowStep.find({ flow_id: flow.id });
        const machineSteps = flowSteps.filter(s => s.step_type === 'machine_operation');
        const completedMachineSteps = machineSteps.filter(s => s.status === 'completed');
        
        if (machineSteps.length > 0 && completedMachineSteps.length === machineSteps.length) {
          // All machine steps completed
          if (waste.length > 0) {
            currentStage = 'wastage'; // Waste records exist
          } else {
            currentStage = 'machine'; // Machine done but no waste yet
          }
        }
      }
    } else if (draftState && draftState.consumed_materials && draftState.consumed_materials.length > 0) {
      currentStage = 'planning'; // Materials in draft but not consumed yet
    }
    
    console.log(`📍 Current Stage: ${currentStage.toUpperCase()}`);
    console.log('');
    
    // Stage breakdown
    console.log('📊 STAGE BREAKDOWN:');
    console.log('='.repeat(60));
    console.log(`Material Selection: ${materialConsumption.length > 0 || (draftState?.consumed_materials?.length > 0) ? '✅ Completed' : '⏳ Pending'}`);
    console.log(`Machine Operations: ${flow ? '✅ Started' : '⏳ Not Started'}`);
    if (flow) {
      const flowSteps = await FlowStep.find({ flow_id: flow.id });
      const machineSteps = flowSteps.filter(s => s.step_type === 'machine_operation');
      const completedMachineSteps = machineSteps.filter(s => s.status === 'completed');
      console.log(`   Machine Steps: ${completedMachineSteps.length}/${machineSteps.length} completed`);
    }
    console.log(`Wastage Tracking: ${waste.length > 0 ? '✅ Started' : '⏳ Not Started'}`);
    console.log(`Individual Products: ⏳ Not Checked`);
    
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error checking batch:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get batch number from command line argument
const batchNumber = process.argv[2] || 'BATCH-061289';

console.log(`🔍 Checking batch: ${batchNumber}\n`);
checkBatchStage(batchNumber);

