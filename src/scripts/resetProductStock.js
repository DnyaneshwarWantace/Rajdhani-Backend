import mongoose from 'mongoose';
import Product from '../models/Product.js';
import IndividualProduct from '../models/IndividualProduct.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resetProductStock = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check individual products
    const individualCount = await IndividualProduct.countDocuments({});
    console.log(`📊 IndividualProduct records in database: ${individualCount}\n`);

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Total Product records: ${products.length}\n`);

    console.log('🔄 Resetting all Product stock counts...\n');

    let updatedCount = 0;
    for (const product of products) {
      // Count actual individual products for this product
      const actualCount = await IndividualProduct.countDocuments({
        product_id: product.id,
        status: 'available'
      });

      // Update product stock
      await Product.findOneAndUpdate(
        { id: product.id },
        {
          $set: {
            base_quantity: actualCount,
            current_stock: actualCount,
            individual_products_count: actualCount,
            status: actualCount === 0 ? 'out-of-stock' : (actualCount <= 5 ? 'low-stock' : 'in-stock'),
            updated_at: new Date()
          }
        }
      );

      if (product.base_quantity !== actualCount || product.current_stock !== actualCount) {
        console.log(`   Updated: ${product.name} (${product.id})`);
        console.log(`      Old stock: ${product.current_stock || 0}`);
        console.log(`      New stock: ${actualCount}`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} product records\n`);

    // Show summary
    const stockSummary = await Product.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log('📊 ========== SUMMARY ==========');
    console.log('   Product status breakdown:');
    stockSummary.forEach(item => {
      console.log(`      ${item._id}: ${item.count}`);
    });
    console.log('================================\n');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting product stock:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetProductStock();
