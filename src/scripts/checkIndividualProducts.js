import mongoose from 'mongoose';
import IndividualProduct from '../models/IndividualProduct.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const checkIndividualProducts = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Get total count
    const totalCount = await IndividualProduct.countDocuments({});
    console.log(`📊 Total IndividualProduct records: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No individual products found in database.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // 2. Count by status
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

    console.log('📊 Breakdown by status:');
    statusCounts.forEach(item => {
      console.log(`   ${item._id || 'null'}: ${item.count}`);
    });
    console.log('');

    // 3. Count by product
    const productCounts = await IndividualProduct.aggregate([
      {
        $group: {
          _id: {
            product_id: '$product_id',
            product_name: '$product_name'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log('📦 Top 10 products (by individual product count):');
    productCounts.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item._id.product_name || 'Unknown'}: ${item.count} items`);
    });
    console.log('');

    // 4. Sample records
    const samples = await IndividualProduct.find({}).limit(5).lean();

    console.log('📋 Sample records (first 5):');
    samples.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.product_name} (${item.id}) - Status: ${item.status}`);
    });

    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking individual products:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
checkIndividualProducts();
