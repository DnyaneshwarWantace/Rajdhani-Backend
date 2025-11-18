import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from './src/models/Product.js';
import IdSequence from './src/models/IdSequence.js';
import { generateProductId, generateQRCode } from './src/utils/idGenerator.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON file path
const jsonFilePath = path.join(__dirname, '..', 'product_catalogue_db_ready.json');

async function importProductsFromJSON() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Read JSON file
    console.log('📖 Reading JSON file...');
    console.log(`   File: ${jsonFilePath}\n`);
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON file not found: ${jsonFilePath}`);
    }

    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const products = JSON.parse(jsonData);
    
    console.log(`✅ Found ${products.length} products in JSON file\n`);

    // Clear existing products and ID sequences
    console.log('🗑️  Clearing existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing products\n`);
    
    console.log('🗑️  Clearing ID sequences for PRO and QR...');
    const seqResult = await IdSequence.deleteMany({ prefix: { $in: ['PRO', 'QR'] } });
    console.log(`   Deleted ${seqResult.deletedCount} ID sequences\n`);

    // Import products sequentially to avoid ID generation race conditions
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log('📦 Importing products...\n');
    console.log('   (Importing sequentially to ensure unique IDs)\n');

    for (let i = 0; i < products.length; i++) {
      try {
        const productData = products[i];
        
        // Generate ID and QR code sequentially
        const productId = await generateProductId();
        const qrCode = await generateQRCode();

        // Create product document
        const product = new Product({
          id: productId,
          qr_code: qrCode,
          name: productData.name || '',
          category: productData.category || '',
          subcategory: productData.subcategory || '',
          length: productData.length || '',
          length_unit: productData.length_unit || 'm',
          width: productData.width || '',
          width_unit: productData.width_unit || 'm',
          weight: productData.weight || '',
          weight_unit: productData.weight_unit || '',
          unit: productData.unit || 'SQM',
          // Stock settings
          current_stock: 0,
          base_quantity: 0,
          quantity: 0,
          min_stock_level: 10,
          max_stock_level: 1000,
          reorder_point: 10,
          // Individual tracking
          individual_stock_tracking: true,
          individual_products_count: 0,
          // Status
          status: 'in-stock',
          // Recipe
          has_recipe: false,
          // Timestamps
          created_at: new Date(),
          updated_at: new Date()
          // Note: image_url is intentionally skipped as requested
        });

        // Validate before saving
        await product.validate();
        await product.save();
        
        imported++;
        
        // Progress update every 100 products
        if ((i + 1) % 100 === 0 || i === products.length - 1) {
          console.log(`   Progress: ${i + 1}/${products.length} (${Math.round((i + 1) / products.length * 100)}%) - Imported: ${imported}, Errors: ${errors}`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error importing product ${i + 1} (${products[i]?.name || 'Unknown'}):`, error.message);
        
        // If too many errors, stop
        if (errors > 50) {
          console.error('\n❌ Too many errors. Stopping import.');
          break;
        }
      }
    }

    console.log('\n✅ Import completed!\n');
    console.log('═'.repeat(60));
    console.log('IMPORT SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total products in JSON: ${products.length}`);
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log('═'.repeat(60));

    // Verify import
    const totalInDB = await Product.countDocuments();
    console.log(`\n📊 Total products in database: ${totalInDB}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error importing products:', error);
    process.exit(1);
  }
}

importProductsFromJSON();

