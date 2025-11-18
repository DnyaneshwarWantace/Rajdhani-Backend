import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inputJsonPath = path.join(__dirname, '..', 'product_catalogue_cleaned.json');
const outputJsonPath = path.join(__dirname, '..', 'product_catalogue_cleaned.json'); // Overwrite same file

// Function to keep only SQM in Unit field
const keepSQMOnly = () => {
  try {
    console.log('📖 Reading JSON file...');
    console.log(`   File: ${inputJsonPath}\n`);
    
    // Read the JSON file
    const jsonData = fs.readFileSync(inputJsonPath, 'utf8');
    const products = JSON.parse(jsonData);
    
    console.log(`✅ Found ${products.length} products\n`);
    console.log('🧹 Keeping only SQM in Unit field (removing Square Metres)...\n');
    
    // Clean each product's Unit field
    const cleanedProducts = products.map((product, index) => {
      if (product['Unit']) {
        // Keep only "SQM", remove "Square Metres"
        let unit = product['Unit'];
        // If it contains "SQM", keep just "SQM"
        if (unit.toLowerCase().includes('sqm')) {
          unit = 'SQM';
        } else {
          // If no SQM, keep as is or set to SQM
          unit = 'SQM';
        }
        
        product['Unit'] = unit;
      } else {
        // If Unit is missing, set to SQM
        product['Unit'] = 'SQM';
      }
      return product;
    });
    
    // Write cleaned JSON to file
    const cleanedJson = JSON.stringify(cleanedProducts, null, 2);
    fs.writeFileSync(outputJsonPath, cleanedJson, 'utf8');
    
    console.log(`✅ Successfully updated Unit field to SQM only!`);
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
keepSQMOnly();

