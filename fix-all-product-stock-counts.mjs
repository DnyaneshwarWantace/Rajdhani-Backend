import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', ProductSchema);

const IndividualProductSchema = new mongoose.Schema({}, { strict: false, collection: 'individual_products' });
const IndividualProduct = mongoose.model('IndividualProduct', IndividualProductSchema);

async function fixAllProductStockCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products with individual stock tracking
    const products = await Product.find({ individual_stock_tracking: true });
    console.log(`\n📦 Found ${products.length} products with individual stock tracking`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Count available individual products
        const availableCount = await IndividualProduct.countDocuments({
          product_id: product.id,
          status: 'available'
        });

        // Count total individual products (all statuses)
        const totalCount = await IndividualProduct.countDocuments({
          product_id: product.id
        });

        // Check if update is needed
        const needsUpdate =
          product.current_stock !== availableCount ||
          product.individual_products_count !== totalCount;

        if (needsUpdate) {
          // Update the product
          product.current_stock = availableCount;
          product.individual_products_count = totalCount;
          await product.save();

          console.log(`✅ Updated ${product.id} (${product.name || 'Unknown'}): ${availableCount} available / ${totalCount} total (was: ${product.current_stock} / ${product.individual_products_count})`);
          updatedCount++;
        } else {
          console.log(`ℹ️  Skipped ${product.id} (${product.name || 'Unknown'}): Already correct (${availableCount} / ${totalCount})`);
        }
      } catch (error) {
        console.error(`❌ Error updating product ${product.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${products.length - updatedCount - errorCount}`);
    console.log(`   Errors: ${errorCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAllProductStockCounts();
