import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudflare R2 Configuration
const R2_S3_ACCOUNT_ID = process.env.R2_S3_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'product-images';
const R2_PUBLIC_ACCOUNT_ID = process.env.R2_PUBLIC_ACCOUNT_ID;

const R2_ENDPOINT = `https://${R2_S3_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_PUBLIC_URL = `https://pub-${R2_PUBLIC_ACCOUNT_ID}.r2.dev`;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * List all images from Cloudflare R2
 */
async function listR2Images() {
  try {
    const images = [];
    let continuationToken = null;

    do {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          // Only include image files
          if (object.Key.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
            const publicUrl = `${R2_PUBLIC_URL}/${object.Key}`;
            const fileName = path.basename(object.Key);

            images.push({
              key: object.Key,
              fileName: fileName,
              publicUrl: publicUrl,
              size: object.Size,
              lastModified: object.LastModified,
            });
          }
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
    } while (continuationToken);

    return images;
  } catch (error) {
    console.error('❌ Error listing R2 images:', error.message);
    throw error;
  }
}

/**
 * Main function to update products with R2 image URLs
 */
async function main() {
  try {
    console.log('🚀 Starting product image update from Cloudflare R2...\n');

    // Validate environment variables
    if (!R2_S3_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_ACCOUNT_ID) {
      throw new Error('Missing Cloudflare R2 credentials in .env file');
    }

    if (!MONGODB_URI) {
      throw new Error('Missing MONGODB_URI in .env file');
    }

    console.log(`📡 R2 Endpoint: ${R2_ENDPOINT}`);
    console.log(`🌐 Public URL: ${R2_PUBLIC_URL}`);
    console.log(`📦 Bucket: ${R2_BUCKET_NAME}\n`);

    // List all images from R2
    console.log('📋 Listing all images from Cloudflare R2...');
    const r2Images = await listR2Images();
    console.log(`✅ Found ${r2Images.length} images in R2\n`);

    // Display first few images
    console.log('📸 Sample images from R2:');
    r2Images.slice(0, 10).forEach(img => {
      console.log(`   - ${img.fileName} -> ${img.publicUrl}`);
    });
    console.log('');

    // Create mapping from filename to R2 public URL
    const filenameToR2Url = {};
    for (const img of r2Images) {
      filenameToR2Url[img.fileName] = img.publicUrl;
    }

    // Save R2 images list to file
    const r2ImagesPath = path.join(__dirname, '../../../r2_images_list.json');
    fs.writeFileSync(r2ImagesPath, JSON.stringify(r2Images, null, 2));
    console.log(`💾 Saved R2 images list to ${r2ImagesPath}\n`);

    // Load the link to filename mapping
    const mappingPath = path.join(__dirname, '../../../link_to_filename_mapping.json');
    if (!fs.existsSync(mappingPath)) {
      throw new Error('link_to_filename_mapping.json not found!');
    }

    const linkToFilenameMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`📄 Loaded mapping with ${Object.keys(linkToFilenameMapping).length} Google Drive URLs\n`);

    // Create mapping from Google Drive URL to R2 URL
    const googleDriveToR2 = {};
    let matchedCount = 0;
    let notFoundCount = 0;

    for (const [googleDriveUrl, fileName] of Object.entries(linkToFilenameMapping)) {
      if (filenameToR2Url[fileName]) {
        googleDriveToR2[googleDriveUrl] = filenameToR2Url[fileName];
        matchedCount++;
      } else {
        console.log(`⚠️  Image not found in R2: ${fileName}`);
        notFoundCount++;
      }
    }

    console.log(`\n✅ Matched ${matchedCount} images`);
    console.log(`⚠️  Not found in R2: ${notFoundCount} images\n`);

    // Save the mapping
    const mappingOutputPath = path.join(__dirname, '../../../google_drive_to_r2_mapping.json');
    fs.writeFileSync(mappingOutputPath, JSON.stringify(googleDriveToR2, null, 2));
    console.log(`💾 Saved Google Drive to R2 mapping to ${mappingOutputPath}\n`);

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import Product model
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

    // Count products with Google Drive URLs
    const productsWithGoogleDrive = await Product.countDocuments({
      image_url: { $regex: /^https:\/\/drive\.google\.com/ }
    });
    console.log(`📊 Found ${productsWithGoogleDrive} products with Google Drive URLs\n`);

    // Update products with R2 URLs
    console.log('🔄 Updating products in database...\n');

    let updatedCount = 0;
    let skippedCount = 0;

    for (const [googleDriveUrl, r2Url] of Object.entries(googleDriveToR2)) {
      try {
        const result = await Product.updateMany(
          { image_url: googleDriveUrl },
          { $set: { image_url: r2Url } }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ Updated ${result.modifiedCount} products:`);
          console.log(`   From: ${googleDriveUrl}`);
          console.log(`   To:   ${r2Url}`);
          updatedCount += result.modifiedCount;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating products with URL ${googleDriveUrl}:`, error.message);
      }
    }

    console.log(`\n✅ Database update complete!`);
    console.log(`   - Updated products: ${updatedCount}`);
    console.log(`   - Skipped (no match): ${skippedCount}`);

    // Get final statistics
    const totalProducts = await Product.countDocuments();
    const productsWithR2Urls = await Product.countDocuments({
      image_url: { $regex: /^https:\/\/pub-.*\.r2\.dev/ }
    });
    const productsWithGoogleDriveUrlsRemaining = await Product.countDocuments({
      image_url: { $regex: /^https:\/\/drive\.google\.com/ }
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
    console.log(`   - Products with Google Drive URLs (remaining): ${productsWithGoogleDriveUrlsRemaining}`);
    console.log(`   - Products without images: ${productsWithoutImages}`);

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    console.log('\n🎉 All done!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
