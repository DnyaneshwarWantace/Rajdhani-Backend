// Script to find product stock notifications using the API
// This works if the backend server is running

const API_BASE_URL = 'http://localhost:5000/api';

async function findProductStockNotifications() {
  try {
    console.log('\n🔍 Searching for Product Stock Notifications via API...\n');
    console.log('═'.repeat(80));

    // Get all notifications (you'll need to be authenticated, but for testing we can try)
    const response = await fetch(`${API_BASE_URL}/notifications?limit=1000`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ Authentication required. Please login first or use the database script.');
        console.log('💡 Tip: Run the MongoDB script instead: node scripts/findProductStockNotifications.js');
        return;
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const { data: allNotifications } = await response.json();
    
    console.log(`\n📊 Total notifications from API: ${allNotifications.length}\n`);

    // Filter for stock-related notifications
    const stockNotifications = allNotifications.filter(n => {
      const isStockType = n.type === 'low_stock' || n.type === 'restock_request';
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
        }
        console.log(`   Message: ${(n.message || '').substring(0, 100)}${n.message && n.message.length > 100 ? '...' : ''}`);
        console.log('-'.repeat(80));
      });
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
    
    console.log('\n' + '═'.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Error finding product stock notifications:', error.message);
    if (error.message.includes('fetch')) {
      console.error('\n💡 Make sure the backend server is running on port 5000');
    }
  }
}

// Run the script
findProductStockNotifications();

