import mongoose from 'mongoose';
import RawMaterial from '../models/RawMaterial.js';
import MaterialConsumption from '../models/MaterialConsumption.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - try multiple paths
const envPaths = [
  join(__dirname, '../../.env'),
  join(__dirname, '../../../.env'),
  '.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    envLoaded = true;
    console.log(`📄 Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Warning: .env file not found. Using environment variables from system.');
}

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

    // Get stock from RawMaterial model (direct fields)
    const currentStock = material.current_stock || 0;
    const reservedFromModel = material.reserved_stock || 0;
    const inProductionFromModel = material.in_production || 0;
    const usedFromModel = material.used || 0;
    const soldFromModel = material.sold || 0;

    // Get actual consumption breakdown from MaterialConsumption records
    const consumptionData = await MaterialConsumption.aggregate([
      {
        $match: {
          material_id: materialId,
          material_type: 'raw_material',
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$consumption_status',
          total: { $sum: '$quantity_used' }
        }
      }
    ]);

    // Build breakdown from consumption records
    const breakdown = {
      in_production: 0,
      reserved: 0,
      used: 0,
      sold: 0
    };

    consumptionData.forEach(item => {
      const status = item._id || 'in_production';
      breakdown[status] = item.total || 0;
    });

    // Use consumption records for accurate calculation (matches UI)
    const reserved = breakdown.reserved;
    const inProduction = breakdown.in_production;
    const used = breakdown.used;
    const sold = breakdown.sold;
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
    console.log('📊 STOCK BREAKDOWN (from MaterialConsumption records):');
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
    console.log('📋 RAW MATERIAL MODEL FIELDS (for reference):');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`reserved_stock:  ${reservedFromModel.toLocaleString()} ${material.unit}`);
    console.log(`in_production:   ${inProductionFromModel.toLocaleString()} ${material.unit}`);
    console.log(`used:            ${usedFromModel.toLocaleString()} ${material.unit}`);
    console.log(`sold:            ${soldFromModel.toLocaleString()} ${material.unit}`);
    if (reservedFromModel !== reserved || inProductionFromModel !== inProduction) {
      console.log('');
      console.log('⚠️  NOTE: Model fields differ from consumption records!');
      console.log('   The UI uses MaterialConsumption records for accurate tracking.');
    }
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

