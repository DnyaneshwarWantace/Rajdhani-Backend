import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', ProductSchema);

const IndividualProductSchema = new mongoose.Schema({}, { strict: false, collection: 'individual_products' });
const IndividualProduct = mongoose.model('IndividualProduct', IndividualProductSchema);

async function fixAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Get all products with individual stock tracking
    const products = await Product.find({ 
      individual_stock_tracking: true 
    }).select('id name current_stock individual_products_count').limit(100);
    
    console.log(`Found ${products.length} products with individual tracking\n`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const product of products) {
      const availableCount = await IndividualProduct.countDocuments({
        product_id: product.id,
        status: 'available'
      });
      
      const totalCount = await IndividualProduct.countDocuments({
        product_id: product.id
      });
      
      if (product.individual_products_count !== totalCount) {
        await Product.updateOne(
          { id: product.id },
          { 
            $set: { 
              current_stock: availableCount,
              individual_products_count: totalCount
            }
          }
        );
        console.log(`✅ Fixed ${product.id}: ${availableCount}/${totalCount} (was ${product.current_stock}/${product.individual_products_count})`);
        fixed++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n📊 Summary: Fixed ${fixed}, Skipped ${skipped}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAll();
