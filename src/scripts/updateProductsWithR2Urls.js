import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import { connectDB } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Update products in database with Cloudflare R2 URLs from catalogue
 * Only updates products that currently have Google Drive links
 */
async function updateProductsWithR2Urls() {
  try {
    console.log('🔄 Starting product image URL update from R2 catalogue...\n');

    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Read the mapping file (Google Drive URL -> Cloudflare R2 URL)
    const mappingPath = path.join(__dirname, '../../../google_drive_to_r2_mapping.json');
    
    if (!fs.existsSync(mappingPath)) {
      throw new Error(`Mapping file not found: ${mappingPath}`);
    }

    console.log('📖 Reading Google Drive to R2 URL mapping...');
    const googleDriveToR2 = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`   Found ${Object.keys(googleDriveToR2).length} URL mappings\n`);

    // Read the catalogue file
    const cataloguePath = path.join(__dirname, '../../../product_catalogue_with_r2_urls.json');
    
    if (!fs.existsSync(cataloguePath)) {
      throw new Error(`Catalogue file not found: ${cataloguePath}`);
    }

    console.log('📖 Reading product catalogue...');
    const catalogueData = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    console.log(`   Found ${catalogueData.length} products in catalogue\n`);

    // Create a map: product name + dimensions -> Cloudflare R2 URL
    // We'll match by name, length, width, and weight for accuracy
    const productToR2Url = new Map();
    
    catalogueData.forEach(product => {
      if (product.image_url) {
        let r2Url = null;
        
        // If it's already an R2 URL, use it directly
        if (product.image_url.includes('r2.dev')) {
          r2Url = product.image_url;
        }
        // If it's a Google Drive URL, look it up in the mapping
        else if (product.image_url.includes('drive.google.com')) {
          r2Url = googleDriveToR2[product.image_url];
        }
        
        if (r2Url) {
          const key = `${product.name}|${product.length}|${product.width}|${product.weight}`;
          productToR2Url.set(key, r2Url);
        }
      }
    });

    console.log(`📋 Found ${productToR2Url.size} products with Cloudflare R2 URLs\n`);
    console.log('🔍 Searching database for products to update...\n');

    // Get all products from database
    const allProducts = await Product.find({});
    console.log(`   Found ${allProducts.length} total products in database\n`);

    if (allProducts.length === 0) {
      console.log('⚠️  No products found in database.\n');
      await mongoose.connection.close();
      return;
    }

    console.log('🔄 Matching and updating products...\n');
    console.log('='.repeat(60));

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0; // Products that already have R2 URLs or no Google Drive link

    for (let i = 0; i < allProducts.length; i++) {
      const dbProduct = allProducts[i];
      
      // Only update products that have Google Drive links
      if (!dbProduct.image_url || !dbProduct.image_url.includes('drive.google.com')) {
        skippedCount++;
        continue;
      }
      
      // Build the key to match with catalogue
      const key = `${dbProduct.name}|${dbProduct.length}|${dbProduct.width}|${dbProduct.weight}`;
      const r2Url = productToR2Url.get(key);

      if (r2Url) {
        // Update the product with Cloudflare R2 URL
        await Product.updateOne(
          { _id: dbProduct._id },
          { $set: { image_url: r2Url } }
        );

        updatedCount++;
        
        if (updatedCount <= 10 || updatedCount % 50 === 0) {
          console.log(`[${i + 1}/${allProducts.length}] ✅ Updated: ${dbProduct.name}`);
          console.log(`   Dimensions: ${dbProduct.length}${dbProduct.length_unit} x ${dbProduct.width}${dbProduct.width_unit}, ${dbProduct.weight}${dbProduct.weight_unit}`);
          console.log(`   Old: ${dbProduct.image_url.substring(0, 60)}...`);
          console.log(`   New: ${r2Url.substring(0, 80)}...`);
          console.log('');
        }
      } else {
        notFoundCount++;
        if (notFoundCount <= 5) {
          console.log(`[${i + 1}/${allProducts.length}] ⚠️  No R2 URL found for: ${dbProduct.name}`);
          console.log(`   Dimensions: ${dbProduct.length}${dbProduct.length_unit} x ${dbProduct.width}${dbProduct.width_unit}, ${dbProduct.weight}${dbProduct.weight_unit}`);
          console.log('');
        }
      }
    }

    console.log('='.repeat(60));
    console.log('\n📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total products in database: ${allProducts.length}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already R2 or no Google Drive): ${skippedCount}`);
    console.log(`⚠️  No matching R2 URL found: ${notFoundCount}`);
    console.log('='.repeat(60));

    // Get final statistics
    const totalProducts = await Product.countDocuments();
    const productsWithR2Urls = await Product.countDocuments({
      image_url: { $regex: /^https:\/\/pub-.*\.r2\.dev/ }
    });
    const productsWithGoogleDriveUrls = await Product.countDocuments({
      image_url: { $regex: /^https:\/\/drive\.google\.com/ }
    });
    const productsWithoutImages = await Product.countDocuments({
      $or: [
        { image_url: { $exists: false } },
        { image_url: '' },
        { image_url: null }
      ]
    });

    console.log('\n📊 DATABASE STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total products: ${totalProducts}`);
    console.log(`Products with Cloudflare R2 URLs: ${productsWithR2Urls}`);
    console.log(`Products with Google Drive URLs (remaining): ${productsWithGoogleDriveUrls}`);
    console.log(`Products without images: ${productsWithoutImages}`);
    console.log('='.repeat(60));

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    console.log('\n🎉 Update complete!');

  } catch (error) {
    console.error('❌ Error updating products:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the update
updateProductsWithR2Urls();

