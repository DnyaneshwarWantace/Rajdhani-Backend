import mongoose from 'mongoose';
import RawMaterial from '../models/RawMaterial.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend directory
dotenv.config({ path: join(__dirname, '../../.env') });

const checkMaterialStock = async (materialId) => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`🔍 Checking stock for material: ${materialId}\n`);

    // Find the material by ID
    const material = await RawMaterial.findOne({ id: materialId });

    if (!material) {
      console.log(`❌ Material with ID "${materialId}" not found in database.`);
      await mongoose.disconnect();
      return;
    }

    // Calculate available stock
    const reserved = material.reserved_stock || 0;
    const inProduction = material.in_production || 0;
    const currentStock = material.current_stock || 0;
    const used = material.used || 0;
    const sold = material.sold || 0;
    const availableStock = Math.max(0, currentStock - reserved - inProduction);

    // Display results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📦 MATERIAL STOCK INFORMATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Material ID:     ${material.id}`);
    console.log(`Name:            ${material.name}`);
    console.log(`Category:        ${material.category || 'N/A'}`);
    console.log(`Type:            ${material.type || 'N/A'}`);
    console.log(`Unit:            ${material.unit}`);
    console.log(`Status:          ${material.status}`);
    console.log('');
    console.log('📊 STOCK BREAKDOWN:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`Current Stock:   ${currentStock.toLocaleString()} ${material.unit}`);
    console.log(`Reserved:        ${reserved.toLocaleString()} ${material.unit}`);
    console.log(`In Production:   ${inProduction.toLocaleString()} ${material.unit}`);
    console.log(`Used:            ${used.toLocaleString()} ${material.unit}`);
    console.log(`Sold:            ${sold.toLocaleString()} ${material.unit}`);
    console.log('');
    console.log(`✅ Available Stock: ${availableStock.toLocaleString()} ${material.unit}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('');
    console.log('💰 FINANCIAL INFORMATION:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`Cost Per Unit:   ₹${material.cost_per_unit?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`);
    console.log(`Total Value:     ₹${material.total_value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`);
    console.log('');
    console.log('📋 ADDITIONAL INFO:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`Supplier:        ${material.supplier_name || 'N/A'}`);
    console.log(`Batch Number:    ${material.batch_number || 'N/A'}`);
    console.log(`Quality Grade:   ${material.quality_grade || 'N/A'}`);
    console.log(`Min Threshold:   ${material.min_threshold || 0} ${material.unit}`);
    console.log(`Max Capacity:    ${material.max_capacity || 0} ${material.unit}`);
    console.log(`Reorder Point:   ${material.reorder_point || 0} ${material.unit}`);
    if (material.last_restocked) {
      console.log(`Last Restocked:  ${new Date(material.last_restocked).toLocaleString()}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Stock status analysis
    if (availableStock <= 0) {
      console.log('⚠️  WARNING: Available stock is 0 or negative!');
    } else if (availableStock <= material.reorder_point) {
      console.log('⚠️  WARNING: Available stock is at or below reorder point!');
    } else if (availableStock <= material.min_threshold) {
      console.log('⚠️  WARNING: Available stock is at or below minimum threshold!');
    } else {
      console.log('✅ Stock levels are healthy');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error checking material stock:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Get material ID from command line argument
const materialId = process.argv[2];

if (!materialId) {
  console.error('❌ Please provide a material ID as an argument');
  console.log('Usage: node checkMaterialStock.js <MATERIAL_ID>');
  console.log('Example: node checkMaterialStock.js MAT-251211-009');
  process.exit(1);
}

checkMaterialStock(materialId);

