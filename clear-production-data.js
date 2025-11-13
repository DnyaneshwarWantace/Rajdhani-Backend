#!/usr/bin/env node
/**
 * Script to remove all production-related data from MongoDB
 * Removes: production batches, steps, flows, flow steps, and material consumption records
 * Keeps: production machines (configuration data)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function clearProductionData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get collections
    const db = mongoose.connection.db;
    
    // Collections to clear
    const collectionsToClear = [
      'production_batches',
      'production_steps',
      'production_flows',
      'production_flow_steps',
      'material_consumption'
    ];

    console.log('🗑️  Clearing production data...\n');

    for (const collectionName of collectionsToClear) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          const result = await collection.deleteMany({});
          console.log(`✅ Cleared ${result.deletedCount} documents from ${collectionName}`);
        } else {
          console.log(`ℹ️  No documents found in ${collectionName}`);
        }
      } catch (error) {
        console.error(`❌ Error clearing ${collectionName}:`, error.message);
      }
    }

    console.log('\n✅ All production data cleared successfully!');
    console.log('\nNote: Production machines were kept (configuration data)');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

clearProductionData();

