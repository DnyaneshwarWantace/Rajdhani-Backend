import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', ProductSchema);

const IndividualProductSchema = new mongoose.Schema({}, { strict: false, collection: 'individual_products' });
const IndividualProduct = mongoose.model('IndividualProduct', IndividualProductSchema);

async function fixStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the product
    const product = await Product.findOne({ id: 'PRO-251217-001' });
    if (!product) {
      console.log('Product not found!');
      process.exit(1);
    }

    console.log('\n📦 Current product data:');
    console.log(`  current_stock: ${product.current_stock}`);
    console.log(`  individual_products_count: ${product.individual_products_count}`);

    // Get individual products count by status
    const allIndividualProducts = await IndividualProduct.find({ product_id: 'PRO-251217-001' });
    const availableCount = allIndividualProducts.filter(p => p.status === 'available').length;
    const totalCount = allIndividualProducts.length;

    console.log('\n📊 Actual individual products:');
    console.log(`  Available: ${availableCount}`);
    console.log(`  Total: ${totalCount}`);

    // Update the product with correct counts
    product.current_stock = availableCount;
    product.individual_products_count = totalCount;
    await product.save();

    console.log('\n✅ Updated product:');
    console.log(`  current_stock: ${product.current_stock} (now shows available only)`);
    console.log(`  individual_products_count: ${product.individual_products_count} (total count)`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixStock();
