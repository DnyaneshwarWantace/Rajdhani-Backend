import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Creating updated product catalogue with Cloudflare R2 URLs...\n');

// Load the Google Drive to R2 mapping
const mappingPath = path.join(__dirname, '../../../google_drive_to_r2_mapping.json');
const googleDriveToR2 = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
console.log(`📄 Loaded ${Object.keys(googleDriveToR2).length} URL mappings\n`);

// Load the product catalogue
const cataloguePath = path.join(__dirname, '../../../product_catalogue_db_ready.json');
console.log('📖 Reading product catalogue...');
const catalogueData = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
console.log(`✅ Loaded ${catalogueData.length} products\n`);

// Update products with R2 URLs
console.log('🔄 Updating image URLs...');
let updatedCount = 0;
let keptGoogleDriveCount = 0;
let noImageCount = 0;

const updatedCatalogue = catalogueData.map(product => {
  // If no image_url, keep as is
  if (!product.image_url) {
    noImageCount++;
    return product;
  }

  // Check if there's a R2 URL for this Google Drive URL
  const r2Url = googleDriveToR2[product.image_url];

  if (r2Url) {
    // Replace with R2 URL
    updatedCount++;
    return {
      ...product,
      image_url: r2Url
    };
  } else {
    // Keep Google Drive URL
    keptGoogleDriveCount++;
    return product;
  }
});

console.log(`✅ Processing complete!\n`);
console.log(`📊 Statistics:`);
console.log(`   - Total products: ${catalogueData.length}`);
console.log(`   - Updated with R2 URLs: ${updatedCount}`);
console.log(`   - Kept Google Drive URLs: ${keptGoogleDriveCount}`);
console.log(`   - Products without images: ${noImageCount}`);

// Save the updated catalogue
const outputPath = path.join(__dirname, '../../../product_catalogue_with_r2_urls.json');
fs.writeFileSync(outputPath, JSON.stringify(updatedCatalogue, null, 2));
console.log(`\n💾 Saved updated catalogue to: product_catalogue_with_r2_urls.json`);

// Show sample of updated products
console.log(`\n📸 Sample updated products:`);
const samplesWithR2 = updatedCatalogue.filter(p => p.image_url && p.image_url.includes('r2.dev')).slice(0, 3);
samplesWithR2.forEach((product, index) => {
  console.log(`\n${index + 1}. ${product.name}`);
  console.log(`   Image: ${product.image_url.substring(0, 80)}...`);
});

console.log('\n🎉 Done!');
