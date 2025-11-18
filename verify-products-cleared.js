import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

async function verifyCleared() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Check products
    const productCount = await Product.countDocuments({});
    console.log(`📦 Products in database: ${productCount}`);
    
    if (productCount > 0) {
      console.log('🗑️  Removing remaining products...');
      const result = await Product.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} products\n`);
    }

    // Check ID sequences
    const proSeqs = await IdSequence.countDocuments({ prefix: 'PRO' });
    const qrSeqs = await IdSequence.countDocuments({ prefix: 'QR' });
    console.log(`🔢 PRO sequences: ${proSeqs}`);
    console.log(`🔢 QR sequences: ${qrSeqs}`);
    
    if (proSeqs > 0 || qrSeqs > 0) {
      console.log('🗑️  Removing PRO and QR sequences...');
      const seqResult = await IdSequence.deleteMany({ prefix: { $in: ['PRO', 'QR'] } });
      console.log(`✅ Deleted ${seqResult.deletedCount} sequences\n`);
    }

    // Final verification
    const finalProductCount = await Product.countDocuments({});
    const finalProSeqs = await IdSequence.countDocuments({ prefix: 'PRO' });
    const finalQrSeqs = await IdSequence.countDocuments({ prefix: 'QR' });
    
    console.log('\n✅ Verification Complete:');
    console.log(`   Products: ${finalProductCount}`);
    console.log(`   PRO sequences: ${finalProSeqs}`);
    console.log(`   QR sequences: ${finalQrSeqs}`);
    
    if (finalProductCount === 0 && finalProSeqs === 0 && finalQrSeqs === 0) {
      console.log('\n✅ All products and sequences cleared successfully!');
    } else {
      console.log('\n⚠️  Some items still remain. Please check manually.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCleared();

