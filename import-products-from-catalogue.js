import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from './src/models/Product.js';
import DropdownOption from './src/models/DropdownOption.js';
import { generateProductId, generateQRCode } from './src/utils/idGenerator.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Excel file path
const excelFilePath = path.join(__dirname, '..', 'product_catalogue_step1_image_filled.xlsx');

// Function to read Excel file
const readExcelFile = () => {
  try {
    console.log('📖 Reading Excel file...');
    console.log(`   File: ${excelFilePath}\n`);
    
    const workbook = XLSX.readFile(excelFilePath);
    
    // Use "Read-Only Sheet" or first sheet
    let sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('read') || name.toLowerCase().includes('sheet')
    ) || workbook.SheetNames[0];
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} rows in sheet: "${sheetName}"\n`);
    return data;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    throw error;
  }
};

// Function to extract and add dropdown options
const extractAndAddDropdownOptions = async (excelData) => {
  console.log('🔍 Extracting dropdown options from Excel data...\n');
  
  const categories = new Set();
  const subcategories = new Set();
  const weightUnits = new Set();
  const lengthUnits = new Set();
  const widthUnits = new Set();
  const units = new Set();
  const lengths = new Set(); // Store unique length VALUES
  const widths = new Set(); // Store unique width VALUES
  
  excelData.forEach(row => {
    // Category
    if (row['Category']) {
      const cat = String(row['Category']).trim();
      if (cat) categories.add(cat);
    }
    
    // Sub Category
    if (row['Sub Category']) {
      const subcat = String(row['Sub Category']).trim();
      if (subcat) subcategories.add(subcat);
    }
    
    // Weight unit (GSM)
    if (row['GSM']) {
      weightUnits.add('GSM');
    }
    
    // Length units - check both feet and metres columns
    if (row['Length (in feet)'] || row['Length (in metres)']) {
      lengthUnits.add('feet');
      lengthUnits.add('meter');
      lengthUnits.add('metre');
    }
    
    // Width units - check both feet and metres columns
    if (row['Width (in feet)'] || row['Width (in metres)']) {
      widthUnits.add('feet');
      widthUnits.add('meter');
      widthUnits.add('metre');
    }
    
    // Extract length VALUES from metres column (keep as is)
    if (row['Length (in metres)']) {
      const lengthValue = String(row['Length (in metres)']).trim();
      if (lengthValue && !isNaN(parseFloat(lengthValue))) {
        lengths.add(lengthValue);
      }
    }
    // Extract length VALUES from feet column (round to whole number)
    if (row['Length (in feet)']) {
      const lengthValue = String(row['Length (in feet)']).trim();
      if (lengthValue && !isNaN(parseFloat(lengthValue))) {
        const rounded = Math.round(parseFloat(lengthValue)).toString();
        lengths.add(rounded);
      }
    }
    
    // Extract width VALUES from metres column (keep as is)
    if (row['Width (in metres)']) {
      const widthValue = String(row['Width (in metres)']).trim();
      if (widthValue && !isNaN(parseFloat(widthValue))) {
        widths.add(widthValue);
      }
    }
    // Extract width VALUES from feet column (round to whole number)
    if (row['Width (in feet)']) {
      const widthValue = String(row['Width (in feet)']).trim();
      if (widthValue && !isNaN(parseFloat(widthValue))) {
        const rounded = Math.round(parseFloat(widthValue)).toString();
        widths.add(rounded);
      }
    }
    
    // Unit field
    if (row['Unit']) {
      const unit = String(row['Unit']).trim();
      if (unit) {
        // Extract unit from "SQM (Square Metres)" format
        const match = unit.match(/\(([^)]+)\)/);
        if (match) {
          units.add(match[1].trim());
        } else {
          units.add(unit);
        }
      }
    }
  });
  
  console.log(`   Found ${categories.size} unique categories`);
  console.log(`   Found ${subcategories.size} unique subcategories`);
  console.log(`   Found ${weightUnits.size} weight units`);
  console.log(`   Found ${lengthUnits.size} length units`);
  console.log(`   Found ${widthUnits.size} width units`);
  console.log(`   Found ${units.size} units`);
  console.log(`   Found ${lengths.size} unique length values`);
  console.log(`   Found ${widths.size} unique width values\n`);
  
  // Add categories
  let added = 0;
  let order = 1;
  for (const category of Array.from(categories).sort()) {
    const existing = await DropdownOption.findOne({ 
      category: 'category', 
      value: category 
    });
    if (!existing) {
      const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newOption = new DropdownOption({
        id: optionId,
        category: 'category',
        value: category,
        display_order: order++,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await newOption.save();
      console.log(`   ✅ Added category: ${category}`);
      added++;
    } else {
      console.log(`   ℹ️  Category already exists: ${category}`);
    }
  }
  
  // Add subcategories
  order = 1;
  for (const subcategory of Array.from(subcategories).sort()) {
    const existing = await DropdownOption.findOne({ 
      category: 'subcategory', 
      value: subcategory 
    });
    if (!existing) {
      const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newOption = new DropdownOption({
        id: optionId,
        category: 'subcategory',
        value: subcategory,
        display_order: order++,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await newOption.save();
      console.log(`   ✅ Added subcategory: ${subcategory}`);
      added++;
    } else {
      console.log(`   ℹ️  Subcategory already exists: ${subcategory}`);
    }
  }
  
  // Add weight units (GSM) - use 'weight_units' and 'weight' categories
  const weightUnitCategories = ['weight_units', 'weight'];
  for (const wuCategory of weightUnitCategories) {
    for (const weightUnit of Array.from(weightUnits).sort()) {
      const existing = await DropdownOption.findOne({ 
        category: wuCategory, 
        value: weightUnit 
      });
      if (!existing) {
        const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newOption = new DropdownOption({
          id: optionId,
          category: wuCategory,
          value: weightUnit,
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        await newOption.save();
        console.log(`   ✅ Added ${wuCategory}: ${weightUnit}`);
        added++;
      }
    }
  }
  
  // Add length units (feet, meter, metre)
  const lengthUnitCategories = ['length_units', 'length_unit'];
  for (const luCategory of lengthUnitCategories) {
    for (const lengthUnit of Array.from(lengthUnits).sort()) {
      const existing = await DropdownOption.findOne({ 
        category: luCategory, 
        value: lengthUnit 
      });
      if (!existing) {
        const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newOption = new DropdownOption({
          id: optionId,
          category: luCategory,
          value: lengthUnit,
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        await newOption.save();
        console.log(`   ✅ Added ${luCategory}: ${lengthUnit}`);
        added++;
      }
    }
  }
  
  // Add width units (feet, meter, metre)
  const widthUnitCategories = ['width_units', 'width_unit'];
  for (const wuCategory of widthUnitCategories) {
    for (const widthUnit of Array.from(widthUnits).sort()) {
      const existing = await DropdownOption.findOne({ 
        category: wuCategory, 
        value: widthUnit 
      });
      if (!existing) {
        const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newOption = new DropdownOption({
          id: optionId,
          category: wuCategory,
          value: widthUnit,
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        await newOption.save();
        console.log(`   ✅ Added ${wuCategory}: ${widthUnit}`);
        added++;
      }
    }
  }
  
  // Add units
  order = 1;
  for (const unit of Array.from(units).sort()) {
    const existing = await DropdownOption.findOne({ 
      category: 'unit', 
      value: unit 
    });
    if (!existing) {
      const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newOption = new DropdownOption({
        id: optionId,
        category: 'unit',
        value: unit,
        display_order: order++,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await newOption.save();
      console.log(`   ✅ Added unit: ${unit}`);
      added++;
    }
  }
  
  // Add length VALUES (sort numerically)
  order = 1;
  const sortedLengths = Array.from(lengths).sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
    return numA - numB;
  });
  
  for (const lengthValue of sortedLengths) {
    const existing = await DropdownOption.findOne({ 
      category: 'length', 
      value: lengthValue 
    });
    if (!existing) {
      const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newOption = new DropdownOption({
        id: optionId,
        category: 'length',
        value: lengthValue,
        display_order: order++,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await newOption.save();
      console.log(`   ✅ Added length: ${lengthValue}`);
      added++;
    } else {
      console.log(`   ℹ️  Length already exists: ${lengthValue}`);
    }
  }
  
  // Add width VALUES (sort numerically)
  order = 1;
  const sortedWidths = Array.from(widths).sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
    return numA - numB;
  });
  
  for (const widthValue of sortedWidths) {
    const existing = await DropdownOption.findOne({ 
      category: 'width', 
      value: widthValue 
    });
    if (!existing) {
      const optionId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newOption = new DropdownOption({
        id: optionId,
        category: 'width',
        value: widthValue,
        display_order: order++,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await newOption.save();
      console.log(`   ✅ Added width: ${widthValue}`);
      added++;
    } else {
      console.log(`   ℹ️  Width already exists: ${widthValue}`);
    }
  }
  
  console.log(`\n✅ Added ${added} new dropdown options\n`);
};

// Function to normalize product data
const normalizeProductData = async (row, index, dropdownOptions) => {
  try {
    // Get name from Title
    const name = String(row['Title'] || '').trim();
    if (!name) {
      return null; // Skip rows without title
    }
    
    // Get category and subcategory - verify they exist in dropdowns
    const category = String(row['Category'] || '').trim();
    const subcategory = String(row['Sub Category'] || '').trim();
    
    // Verify category exists in dropdown
    const categoryExists = dropdownOptions.categories.some(opt => opt.value === category);
    if (!categoryExists && category) {
      console.log(`   ⚠️  Row ${index + 1}: Category "${category}" not found in dropdowns, skipping`);
      return null;
    }
    
    // Verify subcategory exists in dropdown (if provided)
    if (subcategory) {
      const subcategoryExists = dropdownOptions.subcategories.some(opt => opt.value === subcategory);
      if (!subcategoryExists) {
        console.log(`   ⚠️  Row ${index + 1}: Subcategory "${subcategory}" not found in dropdowns, skipping`);
        return null;
      }
    }
    
    // Get length - ONLY use metres (not feet)
    let length = null;
    let lengthUnit = 'meter';
    if (row['Length (in metres)']) {
      length = String(row['Length (in metres)']).trim();
      // Verify length exists in dropdown
      const lengthExists = dropdownOptions.lengths.some(opt => opt.value === length);
      if (!lengthExists) {
        console.log(`   ⚠️  Row ${index + 1}: Length "${length}" not found in dropdowns, skipping`);
        return null;
      }
    } else {
      console.log(`   ⚠️  Row ${index + 1}: No length in metres found, skipping`);
      return null;
    }
    
    // Get width - ONLY use metres (not feet)
    let width = null;
    let widthUnit = 'meter';
    if (row['Width (in metres)']) {
      width = String(row['Width (in metres)']).trim();
      // Verify width exists in dropdown
      const widthExists = dropdownOptions.widths.some(opt => opt.value === width);
      if (!widthExists) {
        console.log(`   ⚠️  Row ${index + 1}: Width "${width}" not found in dropdowns, skipping`);
        return null;
      }
    } else {
      console.log(`   ⚠️  Row ${index + 1}: No width in metres found, skipping`);
      return null;
    }
    
    // Get weight (GSM)
    const weight = row['GSM'] ? String(row['GSM']).trim() : '';
    const weightUnit = weight ? 'GSM' : '';
    
    // Get unit - use "Square Metres" from dropdown (already exists)
    const unit = 'Square Metres'; // Use the dropdown value
    
    // Validate required fields
    if (!category || !length || !width) {
      console.log(`   ⚠️  Row ${index + 1}: Missing required fields, skipping`);
      return null;
    }
    
    return {
      name,
      category,
      subcategory: subcategory || undefined,
      length,
      lengthUnit,
      width,
      widthUnit,
      weight: weight || undefined,
      weightUnit: weightUnit || undefined,
      unit: unit,
      quantity: 0, // Set quantity to 0 as requested
      baseQuantity: 0,
      currentStock: 0,
      status: 'in-stock',
      individualStockTracking: true, // Enable individual tracking for all products
      minStockLevel: 10,
      maxStockLevel: 1000,
      // Skip image_url for now
      // Skip Backing Material
    };
  } catch (error) {
    console.error(`   ❌ Error processing row ${index + 1}:`, error.message);
    return null;
  }
};

// Main import function
const importProducts = async () => {
  try {
    console.log('🔄 Starting product import from catalogue...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Read Excel file
    const excelData = readExcelFile();
    
    if (!excelData || excelData.length === 0) {
      console.log('⚠️  No data found in Excel file');
      process.exit(0);
    }
    
    // Clear all existing products first
    console.log('🗑️  Clearing all existing products...');
    const deletedProducts = await Product.deleteMany({});
    console.log(`   ✅ Deleted ${deletedProducts.deletedCount} existing products\n`);
    
    // Extract and add dropdown options
    await extractAndAddDropdownOptions(excelData);
    
    // Load dropdown options for validation
    console.log('🔍 Loading dropdown options for validation...\n');
    const categories = await DropdownOption.find({ category: 'category', is_active: true }).select('value');
    const subcategories = await DropdownOption.find({ category: 'subcategory', is_active: true }).select('value');
    const lengths = await DropdownOption.find({ category: 'length', is_active: true }).select('value');
    const widths = await DropdownOption.find({ category: 'width', is_active: true }).select('value');
    
    const dropdownOptions = {
      categories: categories.map(c => ({ value: c.value })),
      subcategories: subcategories.map(s => ({ value: s.value })),
      lengths: lengths.map(l => ({ value: l.value })),
      widths: widths.map(w => ({ value: w.value }))
    };
    
    console.log(`   ✅ Loaded ${categories.length} categories, ${subcategories.length} subcategories, ${lengths.length} lengths, ${widths.length} widths\n`);
    
    // Process and import products
    console.log('📦 Processing and importing products...\n');
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 100;
    
    for (let i = 0; i < excelData.length; i += batchSize) {
      const batch = excelData.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const productData = await normalizeProductData(row, i + j, dropdownOptions);
        
        if (!productData) {
          skipped++;
          continue;
        }
        
        try {
          // Generate IDs
          const productId = await generateProductId();
          const qrCode = await generateQRCode();
          
          // Create product
          const product = new Product({
            id: productId,
            qr_code: qrCode,
            name: productData.name,
            category: productData.category,
            subcategory: productData.subcategory,
            length: productData.length,
            length_unit: productData.lengthUnit,
            width: productData.width,
            width_unit: productData.widthUnit,
            weight: productData.weight,
            weight_unit: productData.weightUnit || '',
            unit: productData.unit,
            base_quantity: productData.baseQuantity,
            current_stock: productData.currentStock,
            status: productData.status,
            individual_stock_tracking: true, // Enable individual tracking - client will add individual products during production
            individual_products_count: 0, // No individual products yet, will be added during production
            min_stock_level: productData.minStockLevel,
            max_stock_level: productData.maxStockLevel,
            has_recipe: false,
            created_at: new Date(),
            updated_at: new Date()
          });
          
          await product.save();
          created++;
          
          if (created % 100 === 0) {
            console.log(`   ✅ Imported ${created} products...`);
          }
        } catch (error) {
          errors++;
          console.error(`   ❌ Error importing row ${i + j + 1}:`, error.message);
        }
      }
      
      console.log(`   📊 Progress: ${Math.min(i + batchSize, excelData.length)}/${excelData.length} rows processed`);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   ✅ Created: ${created} products`);
    console.log(`   ⚠️  Skipped: ${skipped} products (duplicates or invalid data)`);
    console.log(`   ❌ Errors: ${errors} products`);
    console.log('═'.repeat(60));
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('💡 MongoDB connection failed. Please check:');
      console.error('   1. MongoDB is running');
      console.error('   2. MONGODB_URI in .env is correct');
      console.error('   3. Network connection is working');
    }
    process.exit(1);
  }
};

// Run the import
importProducts();

