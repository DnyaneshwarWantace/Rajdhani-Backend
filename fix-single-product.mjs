import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', ProductSchema);

const IndividualProductSchema = new mongoose.Schema({}, { strict: false, collection: 'individual_products' });
const IndividualProduct = mongoose.model('IndividualProduct', IndividualProductSchema);

async function fixProductStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const productId = 'PRO-251217-001';
    const product = await Product.findOne({ id: productId });

    if (!product) {
      console.log('Product not found!');
      process.exit(1);
    }

    console.log('\n📦 Current product data:');
    console.log(`  current_stock: ${product.current_stock}`);
    console.log(`  individual_products_count: ${product.individual_products_count}`);

    const availableCount = await IndividualProduct.countDocuments({
      product_id: productId,
      status: 'available'
    });

    const totalCount = await IndividualProduct.countDocuments({
      product_id: productId
    });

    console.log('\n📊 Actual counts:');
    console.log(`  Available: ${availableCount}`);
    console.log(`  Total: ${totalCount}`);

    product.current_stock = availableCount;
    product.individual_products_count = totalCount;
    await product.save();

    console.log('\n✅ Updated to:');
    console.log(`  current_stock: ${availableCount}`);
    console.log(`  individual_products_count: ${totalCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProductStock();
