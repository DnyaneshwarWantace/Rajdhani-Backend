import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import DropdownOption from './src/models/DropdownOption.js';
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

// Function to extract and add length/width dropdown options
const extractAndAddLengthWidthOptions = async (excelData) => {
  console.log('🔍 Extracting length and width values from Excel data...\n');
  
  const lengths = new Set(); // Store unique length VALUES
  const widths = new Set(); // Store unique width VALUES
  
  excelData.forEach(row => {
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
  });
  
  console.log(`   Found ${lengths.size} unique length values`);
  console.log(`   Found ${widths.size} unique width values\n`);
  
  let added = 0;
  
  // Add length VALUES (sort numerically)
  let order = 1;
  const sortedLengths = Array.from(lengths).sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
    return numA - numB;
  });
  
  console.log('📏 Adding length values to dropdowns...\n');
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
  
  console.log('\n📐 Adding width values to dropdowns...\n');
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
  
  console.log(`\n✅ Added ${added} new length/width dropdown options`);
  console.log(`   Total unique lengths: ${lengths.size}`);
  console.log(`   Total unique widths: ${widths.size}\n`);
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting length/width dropdown extraction...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Read Excel file
    const excelData = readExcelFile();
    
    // Extract and add dropdown options
    await extractAndAddLengthWidthOptions(excelData);
    
    console.log('✅ Length/width dropdown extraction completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

main();

