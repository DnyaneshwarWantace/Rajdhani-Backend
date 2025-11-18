import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

async function deleteRemaining() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find and delete remaining products
    const remainingProducts = await Product.find({});
    console.log(`Found ${remainingProducts.length} remaining products:`);
    remainingProducts.forEach(p => {
      console.log(`  - ${p.id}: ${p.name}`);
    });

    if (remainingProducts.length > 0) {
      for (const product of remainingProducts) {
        await Product.findByIdAndDelete(product._id);
        console.log(`✅ Deleted product: ${product.id}`);
      }
    }

    // Delete all PRO sequences
    const proSeqs = await IdSequence.find({ prefix: 'PRO' });
    console.log(`\nFound ${proSeqs.length} PRO sequences`);
    for (const seq of proSeqs) {
      await IdSequence.findByIdAndDelete(seq._id);
      console.log(`✅ Deleted sequence: ${seq.prefix}-${seq.date_str}`);
    }

    // Final verification
    const finalProductCount = await Product.countDocuments({});
    const finalProSeqs = await IdSequence.countDocuments({ prefix: 'PRO' });
    const finalQrSeqs = await IdSequence.countDocuments({ prefix: 'QR' });
    
    console.log('\n✅ Final Status:');
    console.log(`   Products: ${finalProductCount}`);
    console.log(`   PRO sequences: ${finalProSeqs}`);
    console.log(`   QR sequences: ${finalQrSeqs}`);
    
    if (finalProductCount === 0 && finalProSeqs === 0 && finalQrSeqs === 0) {
      console.log('\n✅ All products and sequences cleared successfully!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteRemaining();

