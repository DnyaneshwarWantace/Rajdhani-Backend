import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/Product.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function addCountUnitToProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all products to have count_unit: "rolls"
    const result = await Product.updateMany(
      { count_unit: { $exists: false } }, // Only update products that don't have count_unit yet
      { $set: { count_unit: 'rolls' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} products with count_unit: "rolls"`);

    // Verify the update
    const totalProducts = await Product.countDocuments();
    const productsWithCountUnit = await Product.countDocuments({ count_unit: { $exists: true } });

    console.log(`📊 Total products: ${totalProducts}`);
    console.log(`📊 Products with count_unit: ${productsWithCountUnit}`);

    if (totalProducts === productsWithCountUnit) {
      console.log('✅ All products now have count_unit field');
    } else {
      console.log(`⚠️ ${totalProducts - productsWithCountUnit} products still missing count_unit`);
    }

  } catch (error) {
    console.error('❌ Error updating products:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
addCountUnitToProducts();
