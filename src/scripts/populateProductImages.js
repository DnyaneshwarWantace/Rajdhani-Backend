import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;

async function populateProductImages() {
  try {
    console.log('🚀 Starting product image population...\n');

    // Load the Google Drive to R2 mapping
    const mappingPath = path.join(__dirname, '../../../google_drive_to_r2_mapping.json');
    if (!fs.existsSync(mappingPath)) {
      throw new Error('google_drive_to_r2_mapping.json not found! Run updateProductImagesFromR2.js first.');
    }

    const googleDriveToR2 = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`📄 Loaded mapping with ${Object.keys(googleDriveToR2).length} URLs\n`);

    // Load the product catalogue
    const cataloguePath = path.join(__dirname, '../../../product_catalogue_db_ready.json');
    if (!fs.existsSync(cataloguePath)) {
      throw new Error('product_catalogue_db_ready.json not found!');
    }

    console.log('📖 Reading product catalogue (this may take a moment)...');
    const catalogueData = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    console.log(`✅ Loaded ${catalogueData.length} products from catalogue\n`);

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

    // Process each product from catalogue
    console.log('🔄 Matching and updating products...\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < catalogueData.length; i++) {
      const catalogueProduct = catalogueData[i];

      // Skip if no image_url in catalogue
      if (!catalogueProduct.image_url) {
        skippedCount++;
        continue;
      }

      // Get the R2 URL for this Google Drive URL
      const r2Url = googleDriveToR2[catalogueProduct.image_url];
      if (!r2Url) {
        skippedCount++;
        continue;
      }

      // Build query to find matching product in database
      const query = {
        name: catalogueProduct.name,
        length: catalogueProduct.length,
        width: catalogueProduct.width,
        weight: catalogueProduct.weight
      };

      try {
        // Update all matching products
        const result = await Product.updateMany(
          query,
          { $set: { image_url: r2Url } }
        );

        if (result.modifiedCount > 0) {
          if (i < 10 || result.modifiedCount > 1) {
            console.log(`✅ Updated ${result.modifiedCount} product(s): ${catalogueProduct.name}`);
            console.log(`   Dimensions: ${catalogueProduct.length}${catalogueProduct.length_unit} x ${catalogueProduct.width}${catalogueProduct.width_unit}, ${catalogueProduct.weight}${catalogueProduct.weight_unit}`);
            console.log(`   Image: ${r2Url.substring(0, 80)}...`);
          }
          updatedCount += result.modifiedCount;
        } else {
          if (i < 5) {
            console.log(`⚠️  No match found for: ${catalogueProduct.name} (${catalogueProduct.length}x${catalogueProduct.width}, ${catalogueProduct.weight})`);
          }
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating product: ${catalogueProduct.name}`, error.message);
        errorCount++;
      }

      // Progress indicator
      if ((i + 1) % 500 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${catalogueData.length} processed...`);
        console.log(`   Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}\n`);
      }
    }

    console.log(`\n✅ Product update complete!`);
    console.log(`   - Total products in catalogue: ${catalogueData.length}`);
    console.log(`   - Products updated: ${updatedCount}`);
    console.log(`   - Products skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // Get final statistics
    const totalProducts = await Product.countDocuments();
    const productsWithR2Urls = await Product.countDocuments({
      image_url: { $regex: /^https:\/\/pub-.*\.r2\.dev/ }
    });
    const productsWithoutImages = await Product.countDocuments({
      $or: [
        { image_url: { $exists: false } },
        { image_url: '' },
        { image_url: null }
      ]
    });

    console.log(`\n📊 Final Database Statistics:`);
    console.log(`   - Total products: ${totalProducts}`);
    console.log(`   - Products with Cloudflare R2 URLs: ${productsWithR2Urls}`);
    console.log(`   - Products without images: ${productsWithoutImages}`);

    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    console.log('\n🎉 All done!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

populateProductImages();
