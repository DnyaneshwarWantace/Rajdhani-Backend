import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple .env paths
const envPaths = [
  join(__dirname, '../.env'),           // backend/.env
  join(__dirname, '../../.env'),        // root/.env
  '.env',                                // current directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    envLoaded = true;
    console.log(`✅ Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env file found, using default MongoDB URI');
}

// Notification Schema (simplified for query)
const notificationSchema = new mongoose.Schema({
  id: String,
  type: String,
  title: String,
  message: String,
  priority: String,
  status: String,
  module: String,
  related_id: String,
  related_data: mongoose.Schema.Types.Mixed,
  created_by: String,
  created_at: Date,
  updated_at: Date
}, {
  collection: 'notifications'
});

const Notification = mongoose.model('Notification', notificationSchema);

// Find product stock notifications
const findProductStockNotifications = async () => {
  try {
    console.log('\n🔍 Searching for Product Stock Notifications...\n');
    console.log('═'.repeat(80));

    // Get all notifications
    const allNotifications = await Notification.find({}).sort({ created_at: -1 }).limit(1000);
    
    console.log(`\n📊 Total notifications in database: ${allNotifications.length}\n`);

    // Filter for stock-related notifications
    const stockNotifications = allNotifications.filter(n => {
      // Check if it's a stock-related type
      const isStockType = n.type === 'low_stock' || n.type === 'restock_request';
      
      // Check if title/message contains stock-related keywords
      const titleLower = (n.title || '').toLowerCase();
      const messageLower = (n.message || '').toLowerCase();
      const hasStockKeywords = 
        titleLower.includes('stock') ||
        titleLower.includes('low stock') ||
        titleLower.includes('out of stock') ||
        messageLower.includes('stock') ||
        messageLower.includes('low stock') ||
        messageLower.includes('out of stock');
      
      return isStockType || hasStockKeywords;
    });

    console.log(`📦 Total stock-related notifications: ${stockNotifications.length}\n`);

    // Separate by module
    const productStockNotifications = stockNotifications.filter(n => 
      n.module === 'products' || 
      (n.related_data && n.related_data.product_id) ||
      (n.title && n.title.toLowerCase().includes('product'))
    );

    const materialStockNotifications = stockNotifications.filter(n => 
      n.module === 'materials' ||
      (n.title && n.title.toLowerCase().includes('material shortage'))
    );

    const productionStockNotifications = stockNotifications.filter(n => 
      n.module === 'production' ||
      (n.title && n.title.toLowerCase().includes('production'))
    );

    console.log('═'.repeat(80));
    console.log('\n📊 BREAKDOWN BY MODULE:\n');
    console.log(`   Products: ${productStockNotifications.length}`);
    console.log(`   Materials: ${materialStockNotifications.length}`);
    console.log(`   Production: ${productionStockNotifications.length}`);
    console.log(`   Other: ${stockNotifications.length - productStockNotifications.length - materialStockNotifications.length - productionStockNotifications.length}`);

    // Display Product Stock Notifications
    console.log('\n' + '═'.repeat(80));
    console.log('\n🛍️  PRODUCT STOCK NOTIFICATIONS:\n');
    console.log('═'.repeat(80));

    if (productStockNotifications.length === 0) {
      console.log('\n❌ No product stock notifications found!\n');
    } else {
      productStockNotifications.forEach((n, index) => {
        console.log(`\n${index + 1}. [${n.status.toUpperCase()}] ${n.priority.toUpperCase()} - ${n.type}`);
        console.log(`   Title: ${n.title}`);
        console.log(`   Module: ${n.module}`);
        console.log(`   Related ID: ${n.related_id || 'N/A'}`);
        console.log(`   Created: ${n.created_at ? new Date(n.created_at).toLocaleString() : 'N/A'}`);
        if (n.related_data) {
          console.log(`   Related Data:`);
          if (n.related_data.product_id) console.log(`     - Product ID: ${n.related_data.product_id}`);
          if (n.related_data.product_name) console.log(`     - Product Name: ${n.related_data.product_name}`);
          if (n.related_data.material_id) console.log(`     - Material ID: ${n.related_data.material_id}`);
          if (n.related_data.material_name) console.log(`     - Material Name: ${n.related_data.material_name}`);
          if (n.related_data.batch_id) console.log(`     - Batch ID: ${n.related_data.batch_id}`);
          if (n.related_data.batch_number) console.log(`     - Batch Number: ${n.related_data.batch_number}`);
        }
        console.log(`   Message: ${(n.message || '').substring(0, 100)}${n.message && n.message.length > 100 ? '...' : ''}`);
        console.log('-'.repeat(80));
      });
    }

    // Display Material Stock Notifications (for reference)
    console.log('\n' + '═'.repeat(80));
    console.log('\n📦 MATERIAL STOCK NOTIFICATIONS (for reference - should NOT show on product page):\n');
    console.log('═'.repeat(80));

    if (materialStockNotifications.length === 0) {
      console.log('\n✅ No material stock notifications found (good - these should be on materials page)\n');
    } else {
      console.log(`\n⚠️  Found ${materialStockNotifications.length} material stock notifications (these should NOT appear on product page):\n`);
      materialStockNotifications.slice(0, 5).forEach((n, index) => {
        console.log(`   ${index + 1}. ${n.title}`);
        console.log(`      Type: ${n.type}, Module: ${n.module}`);
      });
      if (materialStockNotifications.length > 5) {
        console.log(`   ... and ${materialStockNotifications.length - 5} more`);
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('\n📋 SUMMARY:\n');
    console.log('═'.repeat(80));
    console.log(`\n✅ Product Stock Notifications: ${productStockNotifications.length}`);
    console.log(`   - Unread: ${productStockNotifications.filter(n => n.status === 'unread').length}`);
    console.log(`   - Read: ${productStockNotifications.filter(n => n.status === 'read').length}`);
    console.log(`\n📦 Material Stock Notifications: ${materialStockNotifications.length} (should be filtered out)`);
    console.log(`\n🏭 Production Stock Notifications: ${productionStockNotifications.length}`);
    
    // Check for notifications that should be categorized as "Stock Notifications"
    const shouldBeStockCategory = productStockNotifications.filter(n => {
      const titleLower = (n.title || '').toLowerCase();
      const messageLower = (n.message || '').toLowerCase();
      return (
        n.type === 'low_stock' ||
        n.type === 'restock_request' ||
        titleLower.includes('low stock') ||
        titleLower.includes('out of stock') ||
        messageLower.includes('low stock') ||
        messageLower.includes('out of stock')
      );
    });

    console.log(`\n🎯 Notifications that SHOULD appear in "Stock Notifications" section: ${shouldBeStockCategory.length}`);
    
    if (shouldBeStockCategory.length > 0) {
      console.log('\n   These notifications should be visible on the product page:');
      shouldBeStockCategory.forEach((n, index) => {
        console.log(`   ${index + 1}. ${n.title} (${n.type}, ${n.status})`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Error finding product stock notifications:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    await findProductStockNotifications();
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

// Run the script
main();

