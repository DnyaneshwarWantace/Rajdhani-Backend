import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Excel file
const excelFilePath = path.join(__dirname, '..', 'product_catalogue_step1_image_filled.xlsx');

console.log('📖 Reading Excel file...');
console.log(`   File: ${excelFilePath}\n`);

try {
  const workbook = XLSX.readFile(excelFilePath);
  
  console.log('📋 Sheet Names:');
  workbook.SheetNames.forEach((name, index) => {
    console.log(`   ${index + 1}. ${name}`);
  });
  
  // Read the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`\n✅ Found ${data.length} rows in sheet: "${firstSheetName}"\n`);
  
  if (data.length > 0) {
    console.log('📊 First row structure:');
    console.log(JSON.stringify(data[0], null, 2));
    
    console.log('\n📊 Column names:');
    const columns = Object.keys(data[0]);
    columns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col}`);
    });
    
    console.log('\n📊 Sample data (first 3 rows):');
    data.slice(0, 3).forEach((row, index) => {
      console.log(`\n   Row ${index + 1}:`);
      Object.keys(row).forEach(key => {
        console.log(`     ${key}: ${row[key]}`);
      });
    });
  }
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  process.exit(1);
}

