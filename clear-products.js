import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

async function clearProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('🗑️  Clearing all products...');
    const result = await Product.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} products\n`);

    // Also reset ID sequences for PRO and QR
    console.log('🗑️  Clearing ID sequences for PRO and QR...');
    const seqResult = await IdSequence.deleteMany({ prefix: { $in: ['PRO', 'QR'] } });
    console.log(`✅ Deleted ${seqResult.deletedCount} ID sequences\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error clearing products:', error);
    process.exit(1);
  }
}

clearProducts();

