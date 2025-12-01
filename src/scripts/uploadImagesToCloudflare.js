import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';

// Set TLS to allow legacy connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'product-images';
const R2_S3_ACCOUNT_ID = process.env.R2_S3_ACCOUNT_ID;
const R2_PUBLIC_ACCOUNT_ID = process.env.R2_PUBLIC_ACCOUNT_ID;

const R2_ENDPOINT = R2_S3_ACCOUNT_ID ? `https://${R2_S3_ACCOUNT_ID}.r2.cloudflarestorage.com` : '';
const R2_PUBLIC_URL = R2_PUBLIC_ACCOUNT_ID ? `https://pub-${R2_PUBLIC_ACCOUNT_ID}.r2.dev` : '';

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
 * Upload a single image to Cloudflare R2
 */
async function uploadImageToR2(imagePath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const fileExtension = path.extname(fileName).toLowerCase();

    // Determine content type
    let contentType = 'image/jpeg';
    if (fileExtension === '.png') contentType = 'image/png';
    else if (fileExtension === '.webp') contentType = 'image/webp';
    else if (fileExtension === '.gif') contentType = 'image/gif';

    const key = `products/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    console.log(`✅ Uploaded ${fileName} -> ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Main function to upload all images and update database
 */
async function main() {
  try {
    console.log('🚀 Starting image upload to Cloudflare R2...\n');

    // Validate environment variables
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ACCOUNT_ID || !R2_PUBLIC_ACCOUNT_ID) {
      throw new Error('Missing Cloudflare R2 credentials in .env file');
    }

    if (!MONGODB_URI) {
      throw new Error('Missing MONGODB_URI in .env file');
    }

    // Load mapping file
    const mappingPath = path.join(__dirname, '../../../link_to_filename_mapping.json');
    const linkToFilenameMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`📄 Loaded mapping with ${Object.keys(linkToFilenameMapping).length} entries\n`);

    // Get all downloaded images
    const imagesDir = path.join(__dirname, '../../../downloaded_images');
    const imageFiles = fs.readdirSync(imagesDir).filter(file =>
      file.match(/\.(jpg|jpeg|png|webp|gif)$/i)
    );
    console.log(`📁 Found ${imageFiles.length} images in downloaded_images folder\n`);

    // Create reverse mapping (filename -> Google Drive URL)
    const filenameToGoogleDriveUrl = {};
    for (const [googleDriveUrl, filename] of Object.entries(linkToFilenameMapping)) {
      filenameToGoogleDriveUrl[filename] = googleDriveUrl;
    }

    // Upload images and create mapping
    const googleDriveToCloudflareMapping = {};
    let uploadedCount = 0;
    let skippedCount = 0;

    console.log('📤 Uploading images to Cloudflare R2...\n');

    for (const imageFile of imageFiles) {
      try {
        const imagePath = path.join(imagesDir, imageFile);
        const googleDriveUrl = filenameToGoogleDriveUrl[imageFile];

        if (!googleDriveUrl) {
          console.log(`⚠️  No mapping found for ${imageFile}, skipping...`);
          skippedCount++;
          continue;
        }

        // Upload to R2
        const cloudflareUrl = await uploadImageToR2(imagePath, imageFile);
        googleDriveToCloudflareMapping[googleDriveUrl] = cloudflareUrl;
        uploadedCount++;

        // Small delay to avoid overwhelming R2
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error processing ${imageFile}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n✅ Upload complete! Uploaded: ${uploadedCount}, Skipped: ${skippedCount}\n`);

    // Save the mapping to a file
    const outputPath = path.join(__dirname, '../../../google_drive_to_cloudflare_mapping.json');
    fs.writeFileSync(outputPath, JSON.stringify(googleDriveToCloudflareMapping, null, 2));
    console.log(`💾 Saved URL mapping to ${outputPath}\n`);

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import Product model
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

    // Update products with Cloudflare URLs
    console.log('🔄 Updating products in database...\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const [googleDriveUrl, cloudflareUrl] of Object.entries(googleDriveToCloudflareMapping)) {
      try {
        const result = await Product.updateMany(
          { image_url: googleDriveUrl },
          { $set: { image_url: cloudflareUrl } }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ Updated ${result.modifiedCount} products with URL: ${cloudflareUrl}`);
          updatedCount += result.modifiedCount;
        } else {
          console.log(`⚠️  No products found with Google Drive URL: ${googleDriveUrl}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating products with URL ${googleDriveUrl}:`, error.message);
      }
    }

    console.log(`\n✅ Database update complete!`);
    console.log(`   - Updated products: ${updatedCount}`);
    console.log(`   - URLs with no matching products: ${notFoundCount}`);

    // Get statistics
    const totalProducts = await Product.countDocuments();
    const productsWithCloudflareUrls = await Product.countDocuments({
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

    console.log(`\n📊 Database Statistics:`);
    console.log(`   - Total products: ${totalProducts}`);
    console.log(`   - Products with Cloudflare R2 URLs: ${productsWithCloudflareUrls}`);
    console.log(`   - Products with Google Drive URLs (remaining): ${productsWithGoogleDriveUrls}`);
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
