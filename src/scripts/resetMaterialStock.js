import mongoose from 'mongoose';
import RawMaterial from '../models/RawMaterial.js';
import IndividualRawMaterial from '../models/IndividualRawMaterial.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resetAllMaterialStock = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Delete all IndividualRawMaterial records
    console.log('\n🗑️  Deleting all IndividualRawMaterial records...');
    const deleteResult = await IndividualRawMaterial.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} IndividualRawMaterial records`);

    // 2. Update all RawMaterial records to set current_stock = 0
    console.log('\n📦 Resetting all RawMaterial stock to 0...');
    const updateResult = await RawMaterial.updateMany(
      {},
      {
        $set: {
          current_stock: 0,
          total_value: 0,
          status: 'out-of-stock',
          updated_at: new Date()
        }
      }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} RawMaterial records`);

    // 3. Show summary
    console.log('\n📊 Summary:');
    const totalMaterials = await RawMaterial.countDocuments({});
    console.log(`   Total materials: ${totalMaterials}`);
    console.log(`   All stock reset to: 0`);
    console.log(`   All status set to: out-of-stock`);

    console.log('\n✅ Stock reset completed successfully!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting stock:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetAllMaterialStock();
