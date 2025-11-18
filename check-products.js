import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

async function checkProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Check products
    const productCount = await Product.countDocuments({});
    console.log(`📦 Total Products: ${productCount}`);
    
    if (productCount > 0) {
      console.log('\n📋 Sample Products (first 10):');
      const products = await Product.find({}).limit(10).select('id name category subcategory');
      products.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.id} - ${p.name}`);
        console.log(`      Category: ${p.category}, Subcategory: ${p.subcategory || 'N/A'}`);
      });
      
      if (productCount > 10) {
        console.log(`   ... and ${productCount - 10} more products`);
      }
    } else {
      console.log('   ✅ No products found - database is empty');
    }

    // Check ID sequences
    const proSeqs = await IdSequence.find({ prefix: 'PRO' });
    const qrSeqs = await IdSequence.find({ prefix: 'QR' });
    
    console.log(`\n🔢 PRO Sequences: ${proSeqs.length}`);
    if (proSeqs.length > 0) {
      proSeqs.forEach(seq => {
        console.log(`   - ${seq.prefix}-${seq.date_str}: last_sequence = ${seq.last_sequence}`);
      });
    }
    
    console.log(`🔢 QR Sequences: ${qrSeqs.length}`);
    if (qrSeqs.length > 0) {
      qrSeqs.forEach(seq => {
        console.log(`   - ${seq.prefix}-${seq.date_str}: last_sequence = ${seq.last_sequence}`);
      });
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Products: ${productCount}`);
    console.log(`PRO Sequences: ${proSeqs.length}`);
    console.log(`QR Sequences: ${qrSeqs.length}`);
    
    if (productCount === 0 && proSeqs.length === 0 && qrSeqs.length === 0) {
      console.log('\n✅ Database is completely empty - ready for import!');
    } else if (productCount > 0) {
      console.log(`\n⚠️  There are ${productCount} products in the database`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProducts();

