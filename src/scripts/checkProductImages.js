import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkProductImages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

    // Get total count
    const total = await Product.countDocuments();
    console.log(`📊 Total products: ${total}\n`);

    // Get sample products
    const sampleProducts = await Product.find().limit(5);
    console.log('📦 Sample products:');
    sampleProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name || 'Unnamed'}`);
      console.log(`   ID: ${product.id || product._id}`);
      console.log(`   Image URL: ${product.image_url || 'NOT SET'}`);
    });

    // Check image_url field distribution
    console.log('\n📊 Image URL Statistics:');

    const withImageUrl = await Product.countDocuments({ image_url: { $exists: true, $ne: '', $ne: null } });
    console.log(`   - Products with image_url field: ${withImageUrl}`);

    const withoutImageUrl = await Product.countDocuments({
      $or: [
        { image_url: { $exists: false } },
        { image_url: '' },
        { image_url: null }
      ]
    });
    console.log(`   - Products without image_url: ${withoutImageUrl}`);

    // Check for specific URL patterns
    const googleDrive = await Product.countDocuments({ image_url: { $regex: /drive\.google\.com/i } });
    console.log(`   - Google Drive URLs: ${googleDrive}`);

    const r2Urls = await Product.countDocuments({ image_url: { $regex: /r2\.dev/i } });
    console.log(`   - R2 URLs: ${r2Urls}`);

    // Get unique URL patterns
    console.log('\n🔍 Sample image URLs from database:');
    const productsWithUrls = await Product.find({
      image_url: { $exists: true, $ne: '', $ne: null }
    }).limit(10);

    productsWithUrls.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.image_url}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProductImages();
