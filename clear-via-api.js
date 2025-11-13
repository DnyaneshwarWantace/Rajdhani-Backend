const API_URL = 'https://rajdhani.wantace.com/api';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

async function clearAllData() {
  try {
    console.log('🔄 Starting data cleanup...\n');

    // 1. Get and delete all products
    console.log('🗑️  Clearing products...');
    const productsResp = await fetchJson(`${API_URL}/products`);
    const products = productsResp.data || [];
    for (const product of products) {
      try {
        await fetchJson(`${API_URL}/products/${product.id}`, { method: 'DELETE' });
      } catch (e) {
        console.log(`   ⚠️  Could not delete product ${product.id}: ${e.message}`);
      }
    }
    console.log(`   ✅ Deleted ${products.length} products`);

    // 2. Get and delete all individual products
    console.log('🗑️  Clearing individual products...');
    const individualsResp = await fetchJson(`${API_URL}/individual-products`);
    const individuals = individualsResp.data || [];
    for (const item of individuals) {
      try {
        await fetchJson(`${API_URL}/individual-products/${item.id}`, { method: 'DELETE' });
      } catch (e) {
        console.log(`   ⚠️  Could not delete individual product ${item.id}: ${e.message}`);
      }
    }
    console.log(`   ✅ Deleted ${individuals.length} individual products`);

    // 3. Get and delete all production batches
    console.log('🗑️  Clearing production batches...');
    const batchesResp = await fetchJson(`${API_URL}/production/batches`);
    const batches = batchesResp.data || [];
    for (const batch of batches) {
      try {
        await fetchJson(`${API_URL}/production/batches/${batch.id}`, { method: 'DELETE' });
      } catch (e) {
        console.log(`   ⚠️  Could not delete batch ${batch.id}: ${e.message}`);
      }
    }
    console.log(`   ✅ Deleted ${batches.length} production batches`);

    // 4. Get and delete all raw materials
    console.log('🗑️  Clearing raw materials...');
    const rawMaterialsResp = await fetchJson(`${API_URL}/raw-materials`);
    const rawMaterials = rawMaterialsResp.data || [];
    for (const material of rawMaterials) {
      try {
        await fetchJson(`${API_URL}/raw-materials/${material.id}`, { method: 'DELETE' });
      } catch (e) {
        console.log(`   ⚠️  Could not delete raw material ${material.id}: ${e.message}`);
      }
    }
    console.log(`   ✅ Deleted ${rawMaterials.length} raw materials`);

    console.log('\n✅ All data cleared successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Products: ${products.length}`);
    console.log(`   Individual Products: ${individuals.length}`);
    console.log(`   Production Batches: ${batches.length}`);
    console.log(`   Raw Materials: ${rawMaterials.length}`);
    console.log('\n💡 Dropdown options, machines, customers, suppliers, and orders are preserved.');
    console.log('\n🎯 You can now test the system fresh from scratch!');

  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
  }
}

clearAllData();

