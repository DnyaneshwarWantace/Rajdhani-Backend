import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Excel file path
const excelFilePath = path.join(__dirname, '..', 'product_catalogue_step1_image_filled.xlsx');
const outputJsonPath = path.join(__dirname, '..', 'product_catalogue.json');

// Function to read Excel file and convert to JSON
const convertExcelToJson = () => {
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
    
    // Convert to JSON
    const jsonData = JSON.stringify(data, null, 2);
    
    // Write to file
    fs.writeFileSync(outputJsonPath, jsonData, 'utf8');
    
    console.log(`✅ Successfully converted Excel to JSON!`);
    console.log(`   Output file: ${outputJsonPath}`);
    console.log(`   Total rows: ${data.length}\n`);
    
    // Show sample of first row
    if (data.length > 0) {
      console.log('📋 Sample row (first product):');
      console.log(JSON.stringify(data[0], null, 2));
      console.log('');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error converting Excel to JSON:', error.message);
    throw error;
  }
};

// Run the conversion
convertExcelToJson();

