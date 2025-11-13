import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Rajdhani';

async function clearAllData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Clear all products
    console.log('🗑️  Clearing products...');
    const productsResult = await db.collection('products').deleteMany({});
    console.log(`   ✅ Deleted ${productsResult.deletedCount} products`);

    // 2. Clear all individual products
    console.log('🗑️  Clearing individual products...');
    const individualProductsResult = await db.collection('individual_products').deleteMany({});
    console.log(`   ✅ Deleted ${individualProductsResult.deletedCount} individual products`);

    // 3. Clear all product recipes
    console.log('🗑️  Clearing product recipes...');
    const recipesResult = await db.collection('product_recipes').deleteMany({});
    console.log(`   ✅ Deleted ${recipesResult.deletedCount} recipes`);

    // 4. Clear all recipe materials
    console.log('🗑️  Clearing recipe materials...');
    const recipeMaterialsResult = await db.collection('recipe_materials').deleteMany({});
    console.log(`   ✅ Deleted ${recipeMaterialsResult.deletedCount} recipe materials`);

    // 5. Clear all production batches
    console.log('🗑️  Clearing production batches...');
    const batchesResult = await db.collection('production_batches').deleteMany({});
    console.log(`   ✅ Deleted ${batchesResult.deletedCount} production batches`);

    // 6. Clear all production flows
    console.log('🗑️  Clearing production flows...');
    const flowsResult = await db.collection('production_flows').deleteMany({});
    console.log(`   ✅ Deleted ${flowsResult.deletedCount} production flows`);

    // 7. Clear all production flow steps
    console.log('🗑️  Clearing production flow steps...');
    const flowStepsResult = await db.collection('production_flow_steps').deleteMany({});
    console.log(`   ✅ Deleted ${flowStepsResult.deletedCount} production flow steps`);

    // 8. Clear all production steps
    console.log('🗑️  Clearing production steps...');
    const stepsResult = await db.collection('production_steps').deleteMany({});
    console.log(`   ✅ Deleted ${stepsResult.deletedCount} production steps`);

    // 9. Clear all material consumption
    console.log('🗑️  Clearing material consumption...');
    const consumptionResult = await db.collection('material_consumption').deleteMany({});
    console.log(`   ✅ Deleted ${consumptionResult.deletedCount} material consumption records`);

    // 10. Clear all production waste
    console.log('🗑️  Clearing production waste...');
    const wasteResult = await db.collection('production_waste').deleteMany({});
    console.log(`   ✅ Deleted ${wasteResult.deletedCount} waste records`);

    // 11. Clear all raw materials
    console.log('🗑️  Clearing raw materials...');
    const rawMaterialsResult = await db.collection('raw_materials').deleteMany({});
    console.log(`   ✅ Deleted ${rawMaterialsResult.deletedCount} raw materials`);

    // 12. Clear all purchase orders
    console.log('🗑️  Clearing purchase orders...');
    const purchaseOrdersResult = await db.collection('purchase_orders').deleteMany({});
    console.log(`   ✅ Deleted ${purchaseOrdersResult.deletedCount} purchase orders`);

    console.log('\n✅ All data cleared successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Products: ${productsResult.deletedCount}`);
    console.log(`   Individual Products: ${individualProductsResult.deletedCount}`);
    console.log(`   Recipes: ${recipesResult.deletedCount}`);
    console.log(`   Recipe Materials: ${recipeMaterialsResult.deletedCount}`);
    console.log(`   Production Batches: ${batchesResult.deletedCount}`);
    console.log(`   Production Flows: ${flowsResult.deletedCount}`);
    console.log(`   Production Flow Steps: ${flowStepsResult.deletedCount}`);
    console.log(`   Production Steps: ${stepsResult.deletedCount}`);
    console.log(`   Material Consumption: ${consumptionResult.deletedCount}`);
    console.log(`   Production Waste: ${wasteResult.deletedCount}`);
    console.log(`   Raw Materials: ${rawMaterialsResult.deletedCount}`);
    console.log(`   Purchase Orders: ${purchaseOrdersResult.deletedCount}`);
    console.log('\n💡 Dropdown options, machines, customers, suppliers, and orders are preserved.');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

clearAllData();

