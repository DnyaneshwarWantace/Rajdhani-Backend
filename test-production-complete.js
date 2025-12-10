const API_BASE_URL = 'https://rajdhani.wantace.com/api';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function testProductionComplete() {
  try {
    console.log('\n🧪 Starting Production Complete Test...\n');

    // Step 1: Get all production batches
    console.log('📋 Step 1: Fetching production batches...');
    const batchesResp = await fetchJson(`${API_BASE_URL}/production/batches`);
    const batches = batchesResp.data || batchesResp;
    
    if (!batches || batches.length === 0) {
      console.log('❌ No production batches found');
      return;
    }
    
    console.log(`✅ Found ${batches.length} batch(es)`);
    const batch = batches[0];
    console.log(`📦 Using batch: ${batch.id}`);
    console.log(`   Product ID: ${batch.product_id}`);
    console.log(`   Status: ${batch.status}`);
    console.log(`   Planned Quantity: ${batch.planned_quantity}`);

    // Step 2: Get the product details
    console.log('\n📋 Step 2: Fetching product details...');
    const productResp = await fetchJson(`${API_BASE_URL}/products/${batch.product_id}`);
    const product = productResp.data || productResp;
    console.log(`✅ Product: ${product.name}`);
    console.log(`   Base Weight: ${product.weight}`);
    console.log(`   Base Length: ${product.length}`);
    console.log(`   Base Width: ${product.width}`);
    console.log(`   Base Thickness: ${product.thickness}`);

    // Step 3: Create individual products in bulk
    console.log('\n📋 Step 3: Creating individual products in bulk...');
    const targetQuantity = batch.planned_quantity || 1;

    const bulkCreateResp = await fetchJson(`${API_BASE_URL}/individual-products/bulk`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: batch.product_id,
        quantity: targetQuantity,
        batch_number: batch.id,
        quality_grade: 'A',
        notes: `Test batch - created via test script`
      })
    });
    
    const bulkData = bulkCreateResp.data || bulkCreateResp;
    const createdIds = bulkData.individual_products || [];
    console.log(`   ✅ Created ${createdIds.length} individual products`);

    // Step 3b: Update each with final details (different from base)
    console.log('\n📋 Step 3b: Updating individual products with final details...');
    const individualProducts = [];
    
    for (let i = 0; i < createdIds.length; i++) {
      const itemId = createdIds[i].id;
      console.log(`   📝 Updating ${itemId} (${i + 1}/${createdIds.length})...`);
      
      await fetchJson(`${API_BASE_URL}/individual-products/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          final_weight: '370 GSM',  // Different from base (400 GSM)
          final_thickness: '5.2 mm',  // Different from base (5mm)
          final_width: '2.05 m',  // Different from base (2 m)
          final_length: '3.15 m',  // Different from base (3 m)
          inspector: 'QA-TEST',
          status: 'available',
          notes: `Test final details - should NOT show base product values (400 GSM, 3m, 2m, 5mm)`
        })
      });
      
      individualProducts.push({ id: itemId });
      console.log(`   ✅ Updated successfully`);
    }

    // Step 4: Update batch status to completed
    console.log('\n📋 Step 4: Marking batch as completed...');
    await fetchJson(`${API_BASE_URL}/production/batches/${batch.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'completed',
        actual_end_date: new Date().toISOString()
      })
    });
    console.log('✅ Batch marked as completed');

    // Step 5: Verify the individual products were saved correctly
    console.log('\n📋 Step 5: Verifying individual products...');
    for (const ind of individualProducts) {
      const verifyResp = await fetchJson(`${API_BASE_URL}/individual-products/${ind.id}`);
      const verified = verifyResp.data || verifyResp;
      
      console.log(`\n   🔍 Verifying ${verified.id}:`);
      console.log(`      Final Weight: ${verified.final_weight || verified.weight} (expected: 370 GSM)`);
      console.log(`      Final Thickness: ${verified.final_thickness || verified.thickness} (expected: 5.2 mm)`);
      console.log(`      Final Width: ${verified.final_width || verified.width} (expected: 2.05 m)`);
      console.log(`      Final Length: ${verified.final_length || verified.length} (expected: 3.15 m)`);
      console.log(`      Status: ${verified.status} (expected: available)`);
      console.log(`      Inspector: ${verified.inspector} (expected: QA-TEST)`);
      console.log(`      Batch Number: ${verified.batch_number} (expected: ${batch.id})`);

      // Check if final details are saved
      const hasFinalWeight = verified.final_weight === '370 GSM' || verified.weight === '370 GSM';
      const hasFinalThickness = verified.final_thickness === '5.2 mm' || verified.thickness === '5.2 mm';
      const hasFinalWidth = verified.final_width === '2.05 m' || verified.width === '2.05 m';
      const hasFinalLength = verified.final_length === '3.15 m' || verified.length === '3.15 m';

      if (hasFinalWeight && hasFinalThickness && hasFinalWidth && hasFinalLength) {
        console.log(`      ✅ PASS: Final details saved correctly`);
      } else {
        console.log(`      ❌ FAIL: Final details NOT saved correctly`);
        console.log(`      Full object:`, JSON.stringify(verified, null, 2));
      }
    }

    // Step 6: Verify batch filtering
    console.log('\n📋 Step 6: Verifying batch filtering...');
    const allIndividualsResp = await fetchJson(`${API_BASE_URL}/individual-products/product/${batch.product_id}`);
    const allIndividuals = allIndividualsResp.data || allIndividualsResp;
    console.log(`   Total individual products for this product: ${allIndividuals.length}`);
    
    const thisBAatchIndividuals = allIndividuals.filter(ind => ind.batch_number === batch.id);
    console.log(`   Individual products for batch ${batch.id}: ${thisBAatchIndividuals.length}`);
    console.log(`   Expected: ${targetQuantity}`);
    
    if (thisBAatchIndividuals.length === targetQuantity) {
      console.log(`   ✅ PASS: Correct number of individuals for this batch`);
    } else {
      console.log(`   ❌ FAIL: Incorrect number of individuals for this batch`);
    }

    console.log('\n✅ Test completed!\n');
    console.log('📊 Summary:');
    console.log(`   Batch ID: ${batch.id}`);
    console.log(`   Product ID: ${batch.product_id}`);
    console.log(`   Individual Products Created: ${individualProducts.length}`);
    console.log(`   Individual Product IDs: ${individualProducts.map(i => i.id).join(', ')}`);
    console.log('\n💡 Now check the Production Summary page in the UI for batch:', batch.id);
    console.log('   It should show ONLY these individual products with the final details entered above.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testProductionComplete();

