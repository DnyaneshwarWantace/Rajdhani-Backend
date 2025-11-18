import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inputJsonPath = path.join(__dirname, '..', 'product_catalogue.json');
const outputJsonPath = path.join(__dirname, '..', 'product_catalogue_cleaned.json');

// Function to clean the JSON data
const cleanProductJson = () => {
  try {
    console.log('📖 Reading JSON file...');
    console.log(`   File: ${inputJsonPath}\n`);
    
    // Read the JSON file
    const jsonData = fs.readFileSync(inputJsonPath, 'utf8');
    const products = JSON.parse(jsonData);
    
    console.log(`✅ Found ${products.length} products\n`);
    console.log('🧹 Cleaning data...\n');
    
    // Clean each product
    const cleanedProducts = products.map((product, index) => {
      const cleaned = {};
      
      // Keep Title
      if (product['Title']) {
        cleaned['Title'] = product['Title'];
      }
      
      // Rename "Length (in metres)" to "Length (m)"
      if (product['Length (in metres)']) {
        cleaned['Length (m)'] = product['Length (in metres)'];
      }
      
      // Rename "Width (in metres)" to "Width (m)"
      if (product['Width (in metres)']) {
        cleaned['Width (m)'] = product['Width (in metres)'];
      }
      
      // Keep Image Src
      if (product['Image Src']) {
        cleaned['Image Src'] = product['Image Src'];
      }
      
      // Keep Unit
      if (product['Unit']) {
        cleaned['Unit'] = product['Unit'];
      }
      
      // Keep GSM
      if (product['GSM']) {
        cleaned['GSM'] = product['GSM'];
      }
      
      // Keep Category
      if (product['Category']) {
        cleaned['Category'] = product['Category'];
      }
      
      // Keep Sub Category
      if (product['Sub Category']) {
        cleaned['Sub Category'] = product['Sub Category'];
      }
      
      // Remove: Handle, Length (in feet), Width (in feet), Backing Material
      // (These are not included in cleaned object)
      
      return cleaned;
    });
    
    // Write cleaned JSON to file
    const cleanedJson = JSON.stringify(cleanedProducts, null, 2);
    fs.writeFileSync(outputJsonPath, cleanedJson, 'utf8');
    
    console.log(`✅ Successfully cleaned JSON file!`);
    console.log(`   Output file: ${outputJsonPath}`);
    console.log(`   Total products: ${cleanedProducts.length}\n`);
    
    // Show sample of first cleaned product
    if (cleanedProducts.length > 0) {
      console.log('📋 Sample cleaned product (first product):');
      console.log(JSON.stringify(cleanedProducts[0], null, 2));
      console.log('');
    }
    
    // Show what was removed
    console.log('🗑️  Removed columns:');
    console.log('   - Handle');
    console.log('   - Length (in feet)');
    console.log('   - Width (in feet)');
    console.log('   - Backing Material');
    console.log('');
    console.log('✏️  Renamed columns:');
    console.log('   - "Length (in metres)" → "Length (m)"');
    console.log('   - "Width (in metres)" → "Width (m)"');
    console.log('');
    
    return cleanedProducts;
  } catch (error) {
    console.error('❌ Error cleaning JSON:', error.message);
    throw error;
  }
};

// Run the cleaning
cleanProductJson();

