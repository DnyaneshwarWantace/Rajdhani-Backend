import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IndividualProduct from './src/models/IndividualProduct.js';
import { ProductionBatch, ProductionStep, ProductionFlow, ProductionFlowStep, MaterialConsumption } from './src/models/Production.js';
import ProductionWaste from './src/models/ProductionWaste.js';
import Order from './src/models/Order.js';
import OrderItem from './src/models/OrderItem.js';
import PurchaseOrder from './src/models/PurchaseOrder.js';
import ProductRecipe from './src/models/ProductRecipe.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

const clearAllData = async () => {
  try {
    console.log('🗑️  Starting data cleanup...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Clear all data in order (respecting dependencies)
    console.log('═'.repeat(60));
    console.log('CLEARING ALL DATA');
    console.log('═'.repeat(60));
    console.log('');
    
    // 1. Clear Order Items (depend on Orders)
    console.log('1️⃣  Clearing Order Items...');
    const orderItemsDeleted = await OrderItem.deleteMany({});
    console.log(`   ✅ Deleted ${orderItemsDeleted.deletedCount} order items\n`);
    
    // 2. Clear Orders
    console.log('2️⃣  Clearing Orders...');
    const ordersDeleted = await Order.deleteMany({});
    console.log(`   ✅ Deleted ${ordersDeleted.deletedCount} orders\n`);
    
    // 3. Clear Purchase Orders
    console.log('3️⃣  Clearing Purchase Orders...');
    const purchaseOrdersDeleted = await PurchaseOrder.deleteMany({});
    console.log(`   ✅ Deleted ${purchaseOrdersDeleted.deletedCount} purchase orders\n`);
    
    // 4. Clear Material Consumption (depend on Production)
    console.log('4️⃣  Clearing Material Consumption...');
    const materialConsumptionDeleted = await MaterialConsumption.deleteMany({});
    console.log(`   ✅ Deleted ${materialConsumptionDeleted.deletedCount} material consumption records\n`);
    
    // 5. Clear Production Waste
    console.log('5️⃣  Clearing Production Waste...');
    const productionWasteDeleted = await ProductionWaste.deleteMany({});
    console.log(`   ✅ Deleted ${productionWasteDeleted.deletedCount} production waste records\n`);
    
    // 6. Clear Production Flow Steps (depend on Production Flows)
    console.log('6️⃣  Clearing Production Flow Steps...');
    const productionFlowStepsDeleted = await ProductionFlowStep.deleteMany({});
    console.log(`   ✅ Deleted ${productionFlowStepsDeleted.deletedCount} production flow steps\n`);
    
    // 7. Clear Production Steps (depend on Production Batches)
    console.log('7️⃣  Clearing Production Steps...');
    const productionStepsDeleted = await ProductionStep.deleteMany({});
    console.log(`   ✅ Deleted ${productionStepsDeleted.deletedCount} production steps\n`);
    
    // 8. Clear Production Flows
    console.log('8️⃣  Clearing Production Flows...');
    const productionFlowsDeleted = await ProductionFlow.deleteMany({});
    console.log(`   ✅ Deleted ${productionFlowsDeleted.deletedCount} production flows\n`);
    
    // 9. Clear Production Batches
    console.log('9️⃣  Clearing Production Batches...');
    const productionBatchesDeleted = await ProductionBatch.deleteMany({});
    console.log(`   ✅ Deleted ${productionBatchesDeleted.deletedCount} production batches\n`);
    
    // 10. Clear Individual Products (depend on Products)
    console.log('🔟 Clearing Individual Products...');
    const individualProductsDeleted = await IndividualProduct.deleteMany({});
    console.log(`   ✅ Deleted ${individualProductsDeleted.deletedCount} individual products\n`);
    
    // 11. Clear Product Recipes (depend on Products)
    console.log('1️⃣1️⃣  Clearing Product Recipes...');
    const productRecipesDeleted = await ProductRecipe.deleteMany({});
    console.log(`   ✅ Deleted ${productRecipesDeleted.deletedCount} product recipes\n`);
    
    // 12. Clear Products (last, as other things depend on them)
    console.log('1️⃣2️⃣  Clearing Products...');
    const productsDeleted = await Product.deleteMany({});
    console.log(`   ✅ Deleted ${productsDeleted.deletedCount} products\n`);
    
    console.log('═'.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   ✅ Order Items: ${orderItemsDeleted.deletedCount}`);
    console.log(`   ✅ Orders: ${ordersDeleted.deletedCount}`);
    console.log(`   ✅ Purchase Orders: ${purchaseOrdersDeleted.deletedCount}`);
    console.log(`   ✅ Material Consumption: ${materialConsumptionDeleted.deletedCount}`);
    console.log(`   ✅ Production Waste: ${productionWasteDeleted.deletedCount}`);
    console.log(`   ✅ Production Flow Steps: ${productionFlowStepsDeleted.deletedCount}`);
    console.log(`   ✅ Production Steps: ${productionStepsDeleted.deletedCount}`);
    console.log(`   ✅ Production Flows: ${productionFlowsDeleted.deletedCount}`);
    console.log(`   ✅ Production Batches: ${productionBatchesDeleted.deletedCount}`);
    console.log(`   ✅ Individual Products: ${individualProductsDeleted.deletedCount}`);
    console.log(`   ✅ Product Recipes: ${productRecipesDeleted.deletedCount}`);
    console.log(`   ✅ Products: ${productsDeleted.deletedCount}`);
    console.log('═'.repeat(60));
    console.log('');
    console.log('🎉 All data cleared successfully!');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('💡 MongoDB connection failed. Please check:');
      console.error('   1. MongoDB is running');
      console.error('   2. MONGODB_URI in .env is correct');
      console.error('   3. Network connection is working');
    }
    process.exit(1);
  }
};

// Run the cleanup
clearAllData();
