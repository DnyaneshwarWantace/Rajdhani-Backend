import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';

dotenv.config();

/**
 * Migration script to fix image URLs in the database
 * 1. Removes the bucket name from the URL path
 * 2. Updates the account ID to the correct one
 * 
 * Old format: https://pub-c81c5826ca7f6f9a1ae1c574077714d9.r2.dev/product-images/products/...
 * New format: https://pub-ef162617dd6143408b2a13d97dd76fc4.r2.dev/products/...
 */
const fixImageUrls = async () => {
  try {
    console.log('🔄 Starting image URL fix...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('');

    const db = mongoose.connection.db;
    
    // Fix URLs in products collection
    console.log('📦 Fixing image URLs in products collection...');
    
    // Find all products with image_url (check for old account ID or bucket name in path)
    const products = await db.collection('products').find({
      image_url: { $exists: true, $ne: null, $ne: '' }
    }).toArray();
    
    console.log(`   📊 Found ${products.length} products with image URLs`);
    
    const OLD_ACCOUNT_ID = 'c81c5826ca7f6f9a1ae1c574077714d9';
    const NEW_ACCOUNT_ID = 'ef162617dd6143408b2a13d97dd76fc4';
    
    let updatedCount = 0;
    for (const product of products) {
      if (product.image_url) {
        let fixedUrl = product.image_url;
        let needsUpdate = false;
        
        // Fix account ID if it's the old one
        if (fixedUrl.includes(OLD_ACCOUNT_ID)) {
          fixedUrl = fixedUrl.replace(OLD_ACCOUNT_ID, NEW_ACCOUNT_ID);
          needsUpdate = true;
        }
        
        // Remove '/product-images/' from the URL if present
        if (fixedUrl.includes('/product-images/')) {
          fixedUrl = fixedUrl.replace('/product-images/', '/');
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await db.collection('products').updateOne(
            { _id: product._id },
            { $set: { image_url: fixedUrl } }
          );
          
          console.log(`   ✅ Fixed: ${product.name || product.id}`);
          console.log(`      Old: ${product.image_url}`);
          console.log(`      New: ${fixedUrl}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`\n   ✅ Updated ${updatedCount} products`);
    console.log('');
    
    // Also check individual_products if they have image_url
    console.log('📦 Checking individual_products collection...');
    const individualProducts = await db.collection('individual_products').find({
      image_url: { $exists: true, $ne: null, $ne: '' }
    }).toArray();
    
    if (individualProducts.length > 0) {
      console.log(`   📊 Found ${individualProducts.length} individual products with image URLs`);
      
      let individualUpdatedCount = 0;
      for (const ip of individualProducts) {
        if (ip.image_url) {
          let fixedUrl = ip.image_url;
          let needsUpdate = false;
          
          // Fix account ID if it's the old one
          if (fixedUrl.includes(OLD_ACCOUNT_ID)) {
            fixedUrl = fixedUrl.replace(OLD_ACCOUNT_ID, NEW_ACCOUNT_ID);
            needsUpdate = true;
          }
          
          // Remove '/product-images/' from the URL if present
          if (fixedUrl.includes('/product-images/')) {
            fixedUrl = fixedUrl.replace('/product-images/', '/');
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await db.collection('individual_products').updateOne(
              { _id: ip._id },
              { $set: { image_url: fixedUrl } }
            );
            
            individualUpdatedCount++;
          }
        }
      }
      
      if (individualUpdatedCount > 0) {
        console.log(`   ✅ Updated ${individualUpdatedCount} individual products`);
      } else {
        console.log('   ℹ️  No individual products needed updates');
      }
    } else {
      console.log('   ℹ️  No individual products with image URLs found');
    }
    console.log('');
    
    console.log('═'.repeat(60));
    console.log('✅ Image URL fix completed successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   - Fixed ${updatedCount} product image URLs`);
    if (individualProducts.length > 0) {
      console.log(`   - Fixed ${individualProducts.length} individual product image URLs`);
    }
    console.log('');
    
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during image URL fix:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the migration
fixImageUrls();

