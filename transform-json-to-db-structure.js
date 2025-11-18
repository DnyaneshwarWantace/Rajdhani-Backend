import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inputJsonPath = path.join(__dirname, '..', 'product_catalogue_cleaned.json');
const outputJsonPath = path.join(__dirname, '..', 'product_catalogue_db_ready.json');

// Function to transform JSON to database structure
const transformJsonToDBStructure = () => {
  try {
    console.log('📖 Reading JSON file...');
    console.log(`   File: ${inputJsonPath}\n`);
    
    // Read the JSON file
    const jsonData = fs.readFileSync(inputJsonPath, 'utf8');
    const products = JSON.parse(jsonData);
    
    console.log(`✅ Found ${products.length} products\n`);
    console.log('🔄 Transforming to database structure...\n');
    
    // Transform each product
    const transformedProducts = products.map((product, index) => {
      const transformed = {};
      
      // Title → name
      if (product['Title']) {
        transformed['name'] = product['Title'];
      }
      
      // Length (m) → length
      if (product['Length (m)']) {
        transformed['length'] = String(product['Length (m)']);
        transformed['length_unit'] = 'm'; // Add length_unit
      }
      
      // Width (m) → width
      if (product['Width (m)']) {
        transformed['width'] = String(product['Width (m)']);
        transformed['width_unit'] = 'm'; // Add width_unit
      }
      
      // GSM → weight, and add weight_unit: "GSM"
      if (product['GSM']) {
        transformed['weight'] = String(product['GSM']);
        transformed['weight_unit'] = 'GSM'; // Add weight_unit
      }
      
      // Unit → unit (keep SQM)
      if (product['Unit']) {
        transformed['unit'] = product['Unit'];
      }
      
      // Category → category
      if (product['Category']) {
        transformed['category'] = product['Category'];
      }
      
      // Sub Category → subcategory
      if (product['Sub Category']) {
        transformed['subcategory'] = product['Sub Category'];
      }
      
      // Image Src → image_url
      if (product['Image Src']) {
        transformed['image_url'] = product['Image Src'];
      }
      
      return transformed;
    });
    
    // Write transformed JSON to file
    const transformedJson = JSON.stringify(transformedProducts, null, 2);
    fs.writeFileSync(outputJsonPath, transformedJson, 'utf8');
    
    console.log(`✅ Successfully transformed JSON to database structure!`);
    console.log(`   Output file: ${outputJsonPath}`);
    console.log(`   Total products: ${transformedProducts.length}\n`);
    
    // Show sample of first transformed product
    if (transformedProducts.length > 0) {
      console.log('📋 Sample transformed product (first product):');
      console.log(JSON.stringify(transformedProducts[0], null, 2));
      console.log('');
    }
    
    // Show mapping summary
    console.log('📝 Field Mapping:');
    console.log('   "Title" → "name"');
    console.log('   "Length (m)" → "length" + "length_unit": "meter"');
    console.log('   "Width (m)" → "width" + "width_unit": "meter"');
    console.log('   "GSM" → "weight" + "weight_unit": "GSM"');
    console.log('   "Unit" → "unit" (SQM)');
    console.log('   "Category" → "category"');
    console.log('   "Sub Category" → "subcategory"');
    console.log('   "Image Src" → "image_url"');
    console.log('');
    
    return transformedProducts;
  } catch (error) {
    console.error('❌ Error transforming JSON:', error.message);
    throw error;
  }
};

// Run the transformation
transformJsonToDBStructure();

