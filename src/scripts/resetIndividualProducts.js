import mongoose from 'mongoose';
import IndividualProduct from '../models/IndividualProduct.js';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resetIndividualProducts = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Get count before reset
    const totalCount = await IndividualProduct.countDocuments({});
    console.log(`📊 Total IndividualProduct records: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No individual products found. Nothing to reset.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // 2. Count by current status
    const statusCounts = await IndividualProduct.aggregate([
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

    console.log('📊 Current status breakdown:');
    statusCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });
    console.log('');

    // 3. Update all individual products to 'available' status
    console.log('🔄 Updating all IndividualProduct records to "available" status...');
    const updateResult = await IndividualProduct.updateMany(
      {},
      {
        $set: {
          status: 'available',
          updated_at: new Date()
        }
      }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} IndividualProduct records to "available"\n`);

    // 4. Update Product stock counts
    console.log('📦 Updating Product stock counts...');
    const products = await Product.find({ individual_stock_tracking: true });

    let updatedProductCount = 0;
    for (const product of products) {
      const availableCount = await IndividualProduct.countDocuments({
        product_id: product.id,
        status: 'available'
      });

      await Product.findOneAndUpdate(
        { id: product.id },
        {
          $set: {
            current_stock: availableCount,
            individual_products_count: availableCount,
            updated_at: new Date()
          }
        }
      );
      updatedProductCount++;
    }
    console.log(`✅ Updated ${updatedProductCount} Product records with new stock counts\n`);

    // 5. Show final summary
    const finalCount = await IndividualProduct.countDocuments({ status: 'available' });

    console.log('📊 ========== SUMMARY ==========');
    console.log(`   Total IndividualProducts:     ${totalCount}`);
    console.log(`   Updated to "available":       ${updateResult.modifiedCount}`);
    console.log(`   Products updated:             ${updatedProductCount}`);
    console.log(`   Final "available" count:      ${finalCount}`);
    console.log('================================\n');

    console.log('✅ All individual products have been reset to "available" status!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting individual products:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetIndividualProducts();
