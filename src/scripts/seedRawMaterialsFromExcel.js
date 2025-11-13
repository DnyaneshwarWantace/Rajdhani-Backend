import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import RawMaterial from '../models/RawMaterial.js';
import DropdownOption from '../models/DropdownOption.js';
import Supplier from '../models/Supplier.js';
import { generateRawMaterialId, generateId } from '../utils/idGenerator.js';
import { connectDB } from '../config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Excel file path
const excelFilePath = path.join(__dirname, '../../../frontend/src/CONNECTED_RAW_MATERIALS_TEMPLATE (3) (1).xlsx');

// Function to clear existing material dropdowns and raw materials
const clearExistingData = async () => {
  console.log('🗑️  Clearing existing material data...\n');
  
  // Clear material dropdowns
  const materialDropdownCategories = ['material_category', 'material_unit', 'material_type', 'material_color'];
  for (const category of materialDropdownCategories) {
    const deleted = await DropdownOption.deleteMany({ category: category });
    console.log(`   ✅ Deleted ${deleted.deletedCount} ${category} options`);
  }
  
  // Clear all raw materials
  const deletedMaterials = await RawMaterial.deleteMany({});
  console.log(`   ✅ Deleted ${deletedMaterials.deletedCount} raw materials`);
  console.log('');
};

// Function to extract and add dropdown options from Excel data
const extractAndAddDropdownOptions = async (excelData) => {
  console.log('🔍 Extracting dropdown options from Excel data...\n');
  
  // Extract unique values from the data
  const categories = new Set();
  const units = new Set();
  const types = new Set();
  const colors = new Set();
  
  excelData.forEach(row => {
    // Category
    if (row['Category'] || row['category']) {
      categories.add((row['Category'] || row['category']).trim());
    }
    
    // Unit
    if (row['Unit'] || row['unit']) {
      const unit = (row['Unit'] || row['unit']).trim().toLowerCase();
      // Normalize common variations
      if (unit === 'metre' || unit === 'meter') units.add('meters');
      else if (unit === 'kg' || unit === 'kilogram') units.add('kg');
      else if (unit === 'litre' || unit === 'liter') units.add('liters');
      else units.add(unit);
    }
    
    // Type
    if (row['Type'] || row['type']) {
      types.add((row['Type'] || row['type']).trim());
    }
    
    // Color
    if (row['Color'] || row['color']) {
      colors.add((row['Color'] || row['color']).trim());
    }
  });
  
  // Add dropdown options
  let addedCount = 0;
  
  // Add categories
  let order = 1;
  for (const category of Array.from(categories).sort()) {
    const optionId = await generateId('OPT');
    const newOption = new DropdownOption({
      id: optionId,
      category: 'material_category',
      value: category,
      display_order: order++,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    await newOption.save();
    console.log(`   ✅ Added material_category: ${category}`);
    addedCount++;
  }
  
  // Add units
  order = 1;
  for (const unit of Array.from(units).sort()) {
    const optionId = await generateId('OPT');
    const newOption = new DropdownOption({
      id: optionId,
      category: 'material_unit',
      value: unit,
      display_order: order++,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    await newOption.save();
    console.log(`   ✅ Added material_unit: ${unit}`);
    addedCount++;
  }
  
  // Add types
  order = 1;
  for (const type of Array.from(types).sort()) {
    const optionId = await generateId('OPT');
    const newOption = new DropdownOption({
      id: optionId,
      category: 'material_type',
      value: type,
      display_order: order++,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    await newOption.save();
    console.log(`   ✅ Added material_type: ${type}`);
    addedCount++;
  }
  
  // Add colors
  order = 1;
  for (const color of Array.from(colors).sort()) {
    const optionId = await generateId('OPT');
    const newOption = new DropdownOption({
      id: optionId,
      category: 'material_color',
      value: color,
      display_order: order++,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    await newOption.save();
    console.log(`   ✅ Added material_color: ${color}`);
    addedCount++;
  }
  
  console.log(`\n📊 Added ${addedCount} dropdown options from Excel data\n`);
};

// Function to read Excel file and extract raw materials from "Raw Material Sheet"
const readExcelFile = () => {
  try {
    console.log('📖 Reading Excel file...');
    console.log(`   File: ${excelFilePath}\n`);
    
    const workbook = XLSX.readFile(excelFilePath);
    
    // Find "Raw Material Sheet" (Sheet2)
    let sheetName = null;
    for (const name of workbook.SheetNames) {
      if (name.toLowerCase().includes('raw material') || name.toLowerCase().includes('material')) {
        sheetName = name;
        break;
      }
    }
    
    if (!sheetName) {
      // Fallback to Sheet2 if not found
      sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} raw materials in sheet: "${sheetName}"\n`);
    return data;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    throw error;
  }
};

// Function to normalize and validate raw material data
const normalizeMaterialData = (row, index) => {
  // Map Excel columns to our schema
  const category = (row['Category'] || row['category'] || 'Other').trim();
  const unit = (row['Unit'] || row['unit'] || 'kg').trim().toLowerCase();
  // Normalize unit
  let normalizedUnit = unit;
  if (unit === 'metre' || unit === 'meter') normalizedUnit = 'meters';
  else if (unit === 'litre' || unit === 'liter') normalizedUnit = 'liters';
  else if (unit === 'kilogram') normalizedUnit = 'kg';
  
  const material = {
    name: (row['Material Name'] || row['material_name'] || row['name'] || `Material ${index + 1}`).trim(),
    type: (row['Type'] || row['type'] || 'other').trim(),
    category: category,
    current_stock: 90, // Set to 90 as requested
    unit: normalizedUnit,
    min_threshold: parseFloat(row['Min Stock Level'] || row['Min Threshold'] || row['min_threshold'] || 10) || 10,
    max_capacity: parseFloat(row['Max Storage Capacity'] || row['Max Capacity'] || row['max_capacity'] || 1000) || 1000,
    reorder_point: parseFloat(row['Reorder Point'] || row['reorder_point'] || 20) || 20,
    supplier_name: (row['Supplier Name'] || row['supplier_name'] || 'Unknown').trim(),
    cost_per_unit: parseFloat(row['Cost Per Unit'] || row['cost_per_unit'] || 0) || 0,
    batch_number: (row['Batch Number'] || row['batch_number'] || `BATCH-${Date.now()}-${index}`).trim(),
    quality_grade: (row['Quality Grade'] || row['quality_grade'] || 'A').trim(),
    color: (row['Color'] || row['color'] || '').trim(),
    image_url: (row['Image URL'] || row['image_url'] || '').trim(),
    status: 'in-stock',
    daily_usage: 0,
    supplier_performance: 5
  };

  return material;
};

// Main function to seed raw materials
const seedRawMaterials = async () => {
  try {
    console.log('🔄 Starting raw material seeding from Excel...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Clear existing material dropdowns and raw materials
    await clearExistingData();

    // Step 2: Read Excel file from "Raw Material Sheet"
    const excelData = readExcelFile();

    if (!excelData || excelData.length === 0) {
      console.log('⚠️  No data found in Excel file');
      process.exit(0);
    }

    // Step 3: Extract and add dropdown options from the actual data
    await extractAndAddDropdownOptions(excelData);

    // Step 4: Get all suppliers to map supplier names
    const suppliers = await Supplier.find({});
    const supplierMap = {};
    suppliers.forEach(supplier => {
      supplierMap[supplier.name.toLowerCase()] = supplier;
    });

    console.log(`📋 Found ${suppliers.length} suppliers in database\n`);

    // Step 5: Process and create raw materials
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      
      try {
        // Normalize data
        const materialData = normalizeMaterialData(row, i);

        // Skip if name is missing
        if (!materialData.name || materialData.name.trim() === '') {
          console.log(`⏭️  Row ${i + 1} has no material name, skipping...`);
          skipped++;
          continue;
        }

        // Find supplier by name
        const supplier = supplierMap[materialData.supplier_name.toLowerCase()];
        if (supplier) {
          materialData.supplier_id = supplier.id;
        } else {
          console.log(`⚠️  Supplier "${materialData.supplier_name}" not found, using name only`);
        }

        // Validate unit (must be in enum)
        const validUnits = ['kg', 'liters', 'rolls', 'meters', 'sqm', 'pieces', 'boxes'];
        if (!validUnits.includes(materialData.unit)) {
          console.log(`⚠️  Invalid unit "${materialData.unit}" for "${materialData.name}", defaulting to "kg"`);
          materialData.unit = 'kg';
        }

        // Generate ID
        const materialId = await generateRawMaterialId();

        // Create raw material
        const rawMaterial = new RawMaterial({
          id: materialId,
          ...materialData,
          total_value: materialData.current_stock * materialData.cost_per_unit
        });

        await rawMaterial.save();
        
        console.log(`✅ Created: ${materialData.name} (${materialId})`);
        console.log(`   📦 Stock: ${materialData.current_stock} ${materialData.unit}`);
        console.log(`   🏷️  Category: ${materialData.category}${materialData.type ? ' | Type: ' + materialData.type : ''}`);
        console.log(`   💰 Cost: ₹${materialData.cost_per_unit}/${materialData.unit}`);
        console.log(`   🏭 Supplier: ${materialData.supplier_name}`);
        console.log('');

        created++;
      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error.message);
        errors++;
      }
    }

    console.log('═'.repeat(60));
    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created} raw materials`);
    console.log(`   ⏭️  Skipped: ${skipped} materials`);
    console.log(`   ❌ Errors: ${errors} materials`);
    console.log('═'.repeat(60));
    console.log('');
    console.log('🎉 Raw material seeding completed!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('💡 MongoDB connection failed. Please check:');
      console.error('   1. MongoDB is running');
      console.error('   2. MONGODB_URI in .env is correct');
      console.error('   3. Network connection is working');
      console.error('');
      console.error('Current MONGODB_URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    }
    process.exit(1);
  }
};

// Run the script
console.log('');
console.log('═'.repeat(60));
console.log('🏭 RAJDHANI - RAW MATERIAL SEEDING FROM EXCEL');
console.log('═'.repeat(60));
console.log('');

seedRawMaterials();
