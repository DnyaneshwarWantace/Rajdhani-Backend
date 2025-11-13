import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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
const jsonOutputPath = path.join(__dirname, '../data/rawMaterials.json');

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

// Function to read Excel file and convert to JSON
const readExcelToJSON = () => {
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

// Function to clean and normalize raw material data
const cleanAndNormalizeData = async (rawData) => {
  console.log('🧹 Cleaning and normalizing data...\n');
  
  // Get all suppliers
  const suppliers = await Supplier.find({});
  const supplierNames = suppliers.map(s => s.name);
  
  if (supplierNames.length === 0) {
    throw new Error('No suppliers found in database. Please add suppliers first.');
  }
  
  const cleanedData = [];
  const categories = new Set();
  const units = new Set();
  const types = new Set();
  const colors = new Set();
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Extract and clean fields
    let name = (row['Material Name'] || row['material_name'] || row['name'] || '').trim();
    if (!name || name === '') {
      console.log(`⚠️  Row ${i + 1} has no material name, skipping...`);
      continue;
    }
    
    let category = (row['Category'] || row['category'] || '').trim();
    if (!category) {
      // Try to infer from name
      const nameLower = name.toLowerCase();
      if (nameLower.includes('paper') || nameLower.includes('print')) category = 'Paper';
      else if (nameLower.includes('ink')) category = 'Ink';
      else if (nameLower.includes('chemical') || nameLower.includes('binder') || nameLower.includes('sbr') || nameLower.includes('sles') || nameLower.includes('dsp') || nameLower.includes('ammonia') || nameLower.includes('filler') || nameLower.includes('cleaner')) category = 'Chemical';
      else if (nameLower.includes('pigment')) category = 'Pigment';
      else if (nameLower.includes('packaging') || nameLower.includes('lamination') || nameLower.includes('hdpe')) category = 'Packaging';
      else if (nameLower.includes('gas') || nameLower.includes('fuel')) category = 'Gas and Fuel';
      else if (nameLower.includes('jute') || nameLower.includes('non woven') || nameLower.includes('fibre') || nameLower.includes('fiber')) category = 'Fibre';
      else category = 'Other';
    }
    categories.add(category);
    
    let unit = (row['Unit'] || row['unit'] || '').trim().toLowerCase();
    if (!unit) {
      // Infer from category
      if (category === 'Paper') unit = 'meters';
      else if (category === 'Ink' || category === 'Chemical') unit = 'liters';
      else unit = 'kg';
    }
    // Normalize unit
    if (unit === 'metre' || unit === 'meter') unit = 'meters';
    else if (unit === 'litre' || unit === 'liter') unit = 'liters';
    else if (unit === 'kilogram' || unit === 'kg') unit = 'kg';
    units.add(unit);
    
    let type = (row['Type'] || row['type'] || '').trim();
    let color = (row['Color'] || row['color'] || '').trim();
    
    // If type is missing but color exists, set type to "color"
    if (!type && color) {
      type = 'color';
    }
    // If both are missing, infer from name
    if (!type) {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('green') || nameLower.includes('red') || nameLower.includes('blue') || 
          nameLower.includes('black') || nameLower.includes('white') || nameLower.includes('yellow') ||
          nameLower.includes('camel') || nameLower.includes('brown') || nameLower.includes('grey') ||
          nameLower.includes('gray') || nameLower.includes('khaki') || nameLower.includes('purple') ||
          nameLower.includes('orange') || nameLower.includes('copper') || nameLower.includes('mustard') ||
          nameLower.includes('apricoat') || nameLower.includes('rani') || nameLower.includes('maroon') ||
          nameLower.includes('magenta') || nameLower.includes('coffee') || nameLower.includes('rust') ||
          nameLower.includes('rose') || nameLower.includes('pink') || nameLower.includes('walnut') ||
          nameLower.includes('olive') || nameLower.includes('sindoori')) {
        type = 'color';
        if (!color) {
          // Extract color from name
          const colorMatch = nameLower.match(/(green|red|blue|black|white|yellow|camel|brown|grey|gray|khaki|purple|orange|copper|mustard|apricoat|rani|maroon|magenta|coffee|rust|rose|pink|walnut|olive|sindoori)/);
          if (colorMatch) color = colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1);
        }
      } else {
        type = 'other';
      }
    }
    if (type) types.add(type);
    if (color) colors.add(color);
    
    // Supplier handling
    let supplierName = (row['Supplier Name'] || row['supplier_name'] || '').trim();
    if (!supplierName) {
      // Try to extract from material name
      const nameParts = name.split(' ');
      for (const part of nameParts) {
        const partLower = part.toLowerCase();
        const matchedSupplier = supplierNames.find(s => s.toLowerCase() === partLower);
        if (matchedSupplier) {
          supplierName = matchedSupplier;
          break;
        }
      }
    }
    // If still no supplier, assign randomly from available suppliers
    if (!supplierName) {
      supplierName = supplierNames[Math.floor(Math.random() * supplierNames.length)];
      console.log(`   ℹ️  Assigned supplier "${supplierName}" to "${name}"`);
    }
    
    // Cost per unit
    let costPerUnit = parseFloat(row['Cost Per Unit'] || row['cost_per_unit'] || 0);
    if (!costPerUnit || isNaN(costPerUnit)) {
      // Assign default cost based on category
      if (category === 'Paper') costPerUnit = 50;
      else if (category === 'Ink') costPerUnit = 200;
      else if (category === 'Chemical') costPerUnit = 150;
      else if (category === 'Pigment') costPerUnit = 300;
      else if (category === 'Packaging') costPerUnit = 80;
      else if (category === 'Fibre') costPerUnit = 250;
      else costPerUnit = 100;
    }
    
    // Batch number
    let batchNumber = (row['Batch Number'] || row['batch_number'] || '').trim();
    if (!batchNumber) {
      batchNumber = `BATCH-${Date.now()}-${i + 1}`;
    }
    
    // Quality grade
    let qualityGrade = (row['Quality Grade'] || row['quality_grade'] || 'A').trim();
    
    // Image URL
    let imageUrl = (row['Image URL'] || row['image_url'] || '').trim();
    
    // Create cleaned material object
    const cleanedMaterial = {
      name: name,
      type: type || 'other',
      category: category,
      unit: unit || 'kg',
      current_stock: 90,
      min_threshold: 10,
      max_capacity: 1000,
      reorder_point: 20,
      supplier_name: supplierName,
      cost_per_unit: costPerUnit,
      batch_number: batchNumber,
      quality_grade: qualityGrade,
      color: color || '',
      image_url: imageUrl,
      status: 'in-stock',
      daily_usage: 0,
      supplier_performance: 5
    };
    
    cleanedData.push(cleanedMaterial);
  }
  
  console.log(`✅ Cleaned ${cleanedData.length} materials\n`);
  console.log(`📊 Found unique values:`);
  console.log(`   Categories: ${categories.size}`);
  console.log(`   Units: ${units.size}`);
  console.log(`   Types: ${types.size}`);
  console.log(`   Colors: ${colors.size}\n`);
  
  return {
    materials: cleanedData,
    dropdowns: {
      categories: Array.from(categories).sort(),
      units: Array.from(units).sort(),
      types: Array.from(types).sort(),
      colors: Array.from(colors).sort()
    }
  };
};

// Function to save cleaned data to JSON file
const saveToJSON = (data) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(jsonOutputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save to JSON file
    fs.writeFileSync(jsonOutputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved cleaned data to: ${jsonOutputPath}\n`);
  } catch (error) {
    console.error('❌ Error saving JSON file:', error.message);
    throw error;
  }
};

// Function to add dropdown options from cleaned data
const addDropdownOptions = async (dropdownData) => {
  console.log('🔍 Adding dropdown options...\n');
  
  let addedCount = 0;
  
  // Add categories
  let order = 1;
  for (const category of dropdownData.categories) {
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
  for (const unit of dropdownData.units) {
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
  for (const type of dropdownData.types) {
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
  for (const color of dropdownData.colors) {
    if (color && color.trim() !== '') {
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
  }
  
  console.log(`\n📊 Added ${addedCount} dropdown options\n`);
};

// Function to import materials from JSON
const importMaterials = async (materialsData) => {
  console.log('📦 Importing materials from cleaned data...\n');
  
  // Get all suppliers
  const suppliers = await Supplier.find({});
  const supplierMap = {};
  suppliers.forEach(supplier => {
    supplierMap[supplier.name.toLowerCase()] = supplier;
  });
  
  let created = 0;
  let errors = 0;
  
  for (let i = 0; i < materialsData.length; i++) {
    const materialData = materialsData[i];
    
    try {
      // Find supplier
      const supplier = supplierMap[materialData.supplier_name.toLowerCase()];
      if (supplier) {
        materialData.supplier_id = supplier.id;
      }
      
      // Validate unit
      const validUnits = ['kg', 'liters', 'rolls', 'meters', 'sqm', 'pieces', 'boxes'];
      if (!validUnits.includes(materialData.unit)) {
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
      console.log(`   🏷️  Category: ${materialData.category} | Type: ${materialData.type}${materialData.color ? ' | Color: ' + materialData.color : ''}`);
      console.log(`   💰 Cost: ₹${materialData.cost_per_unit}/${materialData.unit}`);
      console.log(`   🏭 Supplier: ${materialData.supplier_name}`);
      console.log('');
      
      created++;
    } catch (error) {
      console.error(`❌ Error creating material "${materialData.name}":`, error.message);
      errors++;
    }
  }
  
  console.log('═'.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Created: ${created} raw materials`);
  console.log(`   ❌ Errors: ${errors} materials`);
  console.log('═'.repeat(60));
  console.log('');
};

// Main function
const processAndSeed = async () => {
  try {
    console.log('🔄 Starting raw material processing and seeding...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Clear existing data
    await clearExistingData();
    
    // Step 2: Read Excel file
    const rawData = readExcelToJSON();
    
    if (!rawData || rawData.length === 0) {
      console.log('⚠️  No data found in Excel file');
      process.exit(0);
    }
    
    // Step 3: Clean and normalize data
    const cleanedData = await cleanAndNormalizeData(rawData);
    
    // Step 4: Save to JSON file
    saveToJSON(cleanedData);
    
    // Step 5: Add dropdown options
    await addDropdownOptions(cleanedData.dropdowns);
    
    // Step 6: Import materials
    await importMaterials(cleanedData.materials);
    
    console.log('🎉 Raw material processing and seeding completed!');
    console.log('');
    console.log(`📄 Cleaned JSON file saved at: ${jsonOutputPath}`);
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
console.log('🏭 RAJDHANI - PROCESS AND SEED RAW MATERIALS');
console.log('═'.repeat(60));
console.log('');

processAndSeed();


