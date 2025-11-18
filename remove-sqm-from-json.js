import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inputJsonPath = path.join(__dirname, '..', 'product_catalogue_cleaned.json');
const outputJsonPath = path.join(__dirname, '..', 'product_catalogue_cleaned.json'); // Overwrite same file

// Function to remove SQM from Unit field
const removeSQMFromJson = () => {
  try {
    console.log('📖 Reading JSON file...');
    console.log(`   File: ${inputJsonPath}\n`);
    
    // Read the JSON file
    const jsonData = fs.readFileSync(inputJsonPath, 'utf8');
    const products = JSON.parse(jsonData);
    
    console.log(`✅ Found ${products.length} products\n`);
    console.log('🧹 Removing SQM from Unit field...\n');
    
    // Clean each product's Unit field
    const cleanedProducts = products.map((product, index) => {
      if (product['Unit']) {
        // Remove "SQM" and keep "Square Metres"
        let unit = product['Unit'];
        // Remove "SQM" or "SQM " from the beginning
        unit = unit.replace(/^SQM\s*\(?/i, '');
        // Remove closing parenthesis if present
        unit = unit.replace(/\)$/, '');
        // Trim whitespace
        unit = unit.trim();
        
        product['Unit'] = unit;
      }
      return product;
    });
    
    // Write cleaned JSON to file
    const cleanedJson = JSON.stringify(cleanedProducts, null, 2);
    fs.writeFileSync(outputJsonPath, cleanedJson, 'utf8');
    
    console.log(`✅ Successfully removed SQM from Unit field!`);
    console.log(`   Output file: ${outputJsonPath}`);
    console.log(`   Total products: ${cleanedProducts.length}\n`);
    
    // Show sample of first cleaned product
    if (cleanedProducts.length > 0) {
      console.log('📋 Sample cleaned product (first product):');
      console.log(JSON.stringify(cleanedProducts[0], null, 2));
      console.log('');
    }
    
    return cleanedProducts;
  } catch (error) {
    console.error('❌ Error cleaning JSON:', error.message);
    throw error;
  }
};

// Run the cleaning
removeSQMFromJson();

