import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

async function forceClearAll() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Force delete all products
    console.log('🗑️  Force deleting ALL products...');
    const productResult = await Product.deleteMany({});
    console.log(`✅ Deleted ${productResult.deletedCount} products\n`);

    // Also try to delete using collection directly
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    const directDelete = await productsCollection.deleteMany({});
    console.log(`✅ Direct collection delete: ${directDelete.deletedCount} products\n`);

    // Force delete all PRO and QR sequences
    console.log('🗑️  Force deleting ALL PRO and QR sequences...');
    const seqResult = await IdSequence.deleteMany({ prefix: { $in: ['PRO', 'QR'] } });
    console.log(`✅ Deleted ${seqResult.deletedCount} sequences\n`);

    // Also try direct collection delete for sequences
    const sequencesCollection = db.collection('id_sequences');
    const directSeqDelete = await sequencesCollection.deleteMany({ prefix: { $in: ['PRO', 'QR'] } });
    console.log(`✅ Direct collection delete: ${directSeqDelete.deletedCount} sequences\n`);

    // Final count
    const finalProductCount = await Product.countDocuments({});
    const finalProSeqs = await IdSequence.countDocuments({ prefix: 'PRO' });
    const finalQrSeqs = await IdSequence.countDocuments({ prefix: 'QR' });
    
    console.log('\n✅ Final Status:');
    console.log(`   Products: ${finalProductCount}`);
    console.log(`   PRO sequences: ${finalProSeqs}`);
    console.log(`   QR sequences: ${finalQrSeqs}`);
    
    if (finalProductCount === 0 && finalProSeqs === 0 && finalQrSeqs === 0) {
      console.log('\n✅ All products and sequences cleared successfully!');
    } else {
      console.log('\n⚠️  Some items still remain.');
      if (finalProductCount > 0) {
        const remaining = await Product.find({}).limit(5);
        console.log('   Remaining products:');
        remaining.forEach(p => console.log(`     - ${p.id}: ${p.name}`));
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceClearAll();

