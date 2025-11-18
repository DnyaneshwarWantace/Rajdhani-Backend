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

async function simulateCompletePage() {
  try {
    console.log('\n🧪 Simulating Complete Page Flow...\n');

    // Step 1: Get an existing batch
    console.log('📋 Step 1: Fetching production batch...');
    const batchId = 'BATCH-251029-013'; // Use the test batch
    const batchResp = await fetchJson(`${API_BASE_URL}/production/batches/${batchId}`);
    const batch = batchResp.data || batchResp;
    console.log(`✅ Batch: ${batch.id}, Product: ${batch.product_id}`);

    // Step 2: Simulate user filling in Complete page form
    console.log('\n📋 Step 2: Simulating user input on Complete page...');
    const individualProduct = {
      productId: batch.product_id,
      finalWeight: '375 GSM',  // User types this
      finalThickness: '5.3 mm',  // User types this
      finalWidth: '2.1 m',  // User types this
      finalLength: '3.2 m',  // User types this
      qualityGrade: 'A',
      status: 'available',
      manufacturingDate: new Date().toISOString().split('T')[0],
      inspector: 'UI-TEST',
      notes: 'Simulated from Complete page'
    };

    console.log('   User filled in:');
    console.log(`   - Final Weight: ${individualProduct.finalWeight}`);
    console.log(`   - Final Thickness: ${individualProduct.finalThickness}`);
    console.log(`   - Final Width: ${individualProduct.finalWidth}`);
    console.log(`   - Final Length: ${individualProduct.finalLength}`);

    // Step 3: Create individual product (bulk API)
    console.log('\n📋 Step 3: Creating individual product via bulk API...');
    const bulkResp = await fetchJson(`${API_BASE_URL}/individual-products/bulk`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: batch.product_id,
        quantity: 1,
        batch_number: batch.id,
        quality_grade: individualProduct.qualityGrade,
        notes: individualProduct.notes
      })
    });

    const bulkData = bulkResp.data || bulkResp;
    const createdId = bulkData.individual_products[0].id;
    console.log(`   ✅ Created: ${createdId}`);

    // Step 4: Update with final details (simulating Complete page save)
    console.log('\n📋 Step 4: Updating with final details (Complete page logic)...');
    await fetchJson(`${API_BASE_URL}/individual-products/${createdId}`, {
      method: 'PUT',
      body: JSON.stringify({
        final_weight: individualProduct.finalWeight,
        final_thickness: individualProduct.finalThickness,
        final_width: individualProduct.finalWidth,
        final_length: individualProduct.finalLength,
        quality_grade: individualProduct.qualityGrade,
        status: individualProduct.status,
        production_date: individualProduct.manufacturingDate,
        inspector: individualProduct.inspector,
        notes: individualProduct.notes,
      })
    });
    console.log(`   ✅ Updated with final details`);

    // Step 5: Verify the saved data
    console.log('\n📋 Step 5: Verifying saved data...');
    const verifyResp = await fetchJson(`${API_BASE_URL}/individual-products/${createdId}`);
    const verified = verifyResp.data || verifyResp;

    console.log(`\n   🔍 Verification Results for ${verified.id}:`);
    console.log(`      Expected final_weight: ${individualProduct.finalWeight}`);
    console.log(`      Actual final_weight: ${verified.final_weight}`);
    console.log(`      Expected final_thickness: ${individualProduct.finalThickness}`);
    console.log(`      Actual final_thickness: ${verified.final_thickness}`);
    console.log(`      Expected final_width: ${individualProduct.finalWidth}`);
    console.log(`      Actual final_width: ${verified.final_width}`);
    console.log(`      Expected final_length: ${individualProduct.finalLength}`);
    console.log(`      Actual final_length: ${verified.final_length}`);

    const pass = 
      verified.final_weight === individualProduct.finalWeight &&
      verified.final_thickness === individualProduct.finalThickness &&
      verified.final_width === individualProduct.finalWidth &&
      verified.final_length === individualProduct.finalLength;

    if (pass) {
      console.log(`\n   ✅ PASS: All final details saved correctly!`);
    } else {
      console.log(`\n   ❌ FAIL: Final details do NOT match!`);
      console.log(`\n   Full object:`, JSON.stringify(verified, null, 2));
    }

    console.log(`\n✅ Simulation completed! Created ID: ${createdId}`);
    console.log(`\n💡 Check ProductionSummary for batch ${batch.id} - should show final details above.`);

  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

simulateCompletePage();

