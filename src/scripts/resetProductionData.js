import mongoose from 'mongoose';
import { ProductionBatch, ProductionFlow, ProductionFlowStep, MaterialConsumption } from '../models/Production.js';
import ProductionMachine from '../models/ProductionMachine.js';
import ProductionWaste from '../models/ProductionWaste.js';
import IndividualProduct from '../models/IndividualProduct.js';
import PlanningDraftState from '../models/PlanningDraftState.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resetProductionData = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Delete MaterialConsumption records
    console.log('🗑️  Deleting MaterialConsumption records...');
    const consumptionResult = await MaterialConsumption.deleteMany({});
    console.log(`✅ Deleted ${consumptionResult.deletedCount} MaterialConsumption records\n`);

    // 2. Delete ProductionWaste records
    console.log('🗑️  Deleting ProductionWaste records...');
    const wasteResult = await ProductionWaste.deleteMany({});
    console.log(`✅ Deleted ${wasteResult.deletedCount} ProductionWaste records\n`);

    // 3. Delete IndividualProduct records
    console.log('🗑️  Deleting IndividualProduct records...');
    const individualProductResult = await IndividualProduct.deleteMany({});
    console.log(`✅ Deleted ${individualProductResult.deletedCount} IndividualProduct records\n`);

    // 4. Delete ProductionFlowStep records
    console.log('🗑️  Deleting ProductionFlowStep records...');
    const flowStepResult = await ProductionFlowStep.deleteMany({});
    console.log(`✅ Deleted ${flowStepResult.deletedCount} ProductionFlowStep records\n`);

    // 5. Delete ProductionFlow records
    console.log('🗑️  Deleting ProductionFlow records...');
    const flowResult = await ProductionFlow.deleteMany({});
    console.log(`✅ Deleted ${flowResult.deletedCount} ProductionFlow records\n`);

    // 6. Delete ProductionBatch records
    console.log('🗑️  Deleting ProductionBatch records...');
    const batchResult = await ProductionBatch.deleteMany({});
    console.log(`✅ Deleted ${batchResult.deletedCount} ProductionBatch records\n`);

    // 7. Delete PlanningDraftState records
    console.log('🗑️  Deleting PlanningDraftState records...');
    const draftResult = await PlanningDraftState.deleteMany({});
    console.log(`✅ Deleted ${draftResult.deletedCount} PlanningDraftState records\n`);

    // 8. Reset ProductionMachine status to idle
    console.log('🔄 Resetting ProductionMachine status to idle...');
    const machineResult = await ProductionMachine.updateMany(
      {},
      {
        $set: {
          status: 'idle',
          current_batch_id: null,
          updated_at: new Date()
        }
      }
    );
    console.log(`✅ Reset ${machineResult.modifiedCount} ProductionMachine records\n`);

    // 9. Show summary
    console.log('📊 ========== SUMMARY ==========');
    console.log(`   MaterialConsumption:    ${consumptionResult.deletedCount} deleted`);
    console.log(`   ProductionWaste:        ${wasteResult.deletedCount} deleted`);
    console.log(`   IndividualProduct:      ${individualProductResult.deletedCount} deleted`);
    console.log(`   ProductionFlowStep:     ${flowStepResult.deletedCount} deleted`);
    console.log(`   ProductionFlow:         ${flowResult.deletedCount} deleted`);
    console.log(`   ProductionBatch:        ${batchResult.deletedCount} deleted`);
    console.log(`   PlanningDraftState:     ${draftResult.deletedCount} deleted`);
    console.log(`   ProductionMachine:      ${machineResult.modifiedCount} reset to idle`);
    console.log('================================\n');

    console.log('✅ All production data has been reset successfully!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting production data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetProductionData();
