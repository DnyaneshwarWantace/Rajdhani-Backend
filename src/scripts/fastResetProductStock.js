import mongoose from 'mongoose';
import Product from '../models/Product.js';
import IndividualProduct from '../models/IndividualProduct.js';
import dotenv from 'dotenv';

dotenv.config();

const fastResetProductStock = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Since all individual products are deleted, just bulk update all products to 0
    console.log('🔄 Bulk updating all products to 0 stock...');

    const result = await Product.updateMany(
      {},
      {
        $set: {
          base_quantity: 0,
          current_stock: 0,
          individual_products_count: 0,
          status: 'out-of-stock',
          updated_at: new Date()
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} products\n`);
    console.log('✅ All products now have 0 stock!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fastResetProductStock();
