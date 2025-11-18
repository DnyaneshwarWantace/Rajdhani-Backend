import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

async function finalClear() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Delete ALL products multiple times to ensure they're gone
    let totalDeleted = 0;
    for (let i = 0; i < 5; i++) {
      const result = await Product.deleteMany({});
      totalDeleted += result.deletedCount;
      if (result.deletedCount > 0) {
        console.log(`   Round ${i + 1}: Deleted ${result.deletedCount} products`);
      }
    }
    console.log(`✅ Total products deleted: ${totalDeleted}\n`);

    // Delete ALL PRO and QR sequences multiple times
    let totalSeqsDeleted = 0;
    for (let i = 0; i < 5; i++) {
      const result = await IdSequence.deleteMany({ prefix: { $in: ['PRO', 'QR'] } });
      totalSeqsDeleted += result.deletedCount;
      if (result.deletedCount > 0) {
        console.log(`   Round ${i + 1}: Deleted ${result.deletedCount} sequences`);
      }
    }
    console.log(`✅ Total sequences deleted: ${totalSeqsDeleted}\n`);

    // Final verification
    const finalProductCount = await Product.countDocuments({});
    const finalProSeqs = await IdSequence.countDocuments({ prefix: 'PRO' });
    const finalQrSeqs = await IdSequence.countDocuments({ prefix: 'QR' });
    
    console.log('✅ Final Status:');
    console.log(`   Products: ${finalProductCount}`);
    console.log(`   PRO sequences: ${finalProSeqs}`);
    console.log(`   QR sequences: ${finalQrSeqs}`);
    
    if (finalProductCount === 0 && finalProSeqs === 0 && finalQrSeqs === 0) {
      console.log('\n✅ ALL PRODUCTS AND SEQUENCES CLEARED SUCCESSFULLY!');
      console.log('   You can now run the import script safely.\n');
    } else {
      console.log('\n⚠️  Some items still remain. Please check manually.');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

finalClear();

