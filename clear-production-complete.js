const API_URL = 'https://rajdhani.wantace.com/api';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await response.text();
  if (!response.ok) {
    return { error: text, data: null };
  }
  try {
    return { data: JSON.parse(text), error: null };
  } catch {
    return { data: text, error: null };
  }
}

async function clearProductionData() {
  try {
    console.log('🔄 Starting production data cleanup...\n');

    // Direct MongoDB connection approach
    const mongoose = await import('mongoose');
    const dotenv = await import('dotenv');
    
    dotenv.default.config();
    const MONGODB_URI = process.env.MONGODB_URI;
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.default.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.default.connection.db;

    // 1. Clear production batches
    console.log('🗑️  Clearing production batches...');
    const batchesResult = await db.collection('production_batches').deleteMany({});
    console.log(`   ✅ Deleted ${batchesResult.deletedCount} batches`);

    // 2. Clear production flows
    console.log('🗑️  Clearing production flows...');
    const flowsResult = await db.collection('production_flows').deleteMany({});
    console.log(`   ✅ Deleted ${flowsResult.deletedCount} flows`);

    // 3. Clear production flow steps
    console.log('🗑️  Clearing production flow steps...');
    const flowStepsResult = await db.collection('production_flow_steps').deleteMany({});
    console.log(`   ✅ Deleted ${flowStepsResult.deletedCount} flow steps`);

    // 4. Clear production steps
    console.log('🗑️  Clearing production steps...');
    const stepsResult = await db.collection('production_steps').deleteMany({});
    console.log(`   ✅ Deleted ${stepsResult.deletedCount} steps`);

    // 5. Clear material consumption
    console.log('🗑️  Clearing material consumption...');
    const consumptionResult = await db.collection('material_consumption').deleteMany({});
    console.log(`   ✅ Deleted ${consumptionResult.deletedCount} consumption records`);

    // 6. Clear production waste
    console.log('🗑️  Clearing production waste...');
    const wasteResult = await db.collection('production_waste').deleteMany({});
    console.log(`   ✅ Deleted ${wasteResult.deletedCount} waste records`);

    console.log('\n✅ All production data cleared successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Production Batches: ${batchesResult.deletedCount}`);
    console.log(`   Production Flows: ${flowsResult.deletedCount}`);
    console.log(`   Production Flow Steps: ${flowStepsResult.deletedCount}`);
    console.log(`   Production Steps: ${stepsResult.deletedCount}`);
    console.log(`   Material Consumption: ${consumptionResult.deletedCount}`);
    console.log(`   Production Waste: ${wasteResult.deletedCount}`);
    console.log('\n💡 Products, raw materials, machines, and dropdown options are preserved.');

    await mongoose.default.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error clearing production data:', error.message);
  }
  process.exit(0);
}

clearProductionData();

