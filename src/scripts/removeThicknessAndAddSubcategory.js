import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import IndividualProduct from '../models/IndividualProduct.js';
import DropdownOption from '../models/DropdownOption.js';
import { generateId } from '../utils/idGenerator.js';
import { connectDB } from '../config/database.js';

dotenv.config();

/**
 * Migration script to:
 * 1. Remove thickness field from all products
 * 2. Remove thickness and final_thickness fields from all individual products
 * 3. Add subcategory "test" to product named "test"
 */
const removeThicknessAndAddSubcategory = async () => {
  try {
    console.log('🔄 Starting database migration...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('');

    const db = mongoose.connection.db;

    // 1. Remove thickness from products collection
    console.log('📦 Removing thickness field from products...');
    const productsResult = await db.collection('products').updateMany(
      {},
      { $unset: { thickness: "" } }
    );
    console.log(`   ✅ Updated ${productsResult.modifiedCount} products`);
    console.log(`   📊 Matched ${productsResult.matchedCount} products`);
    console.log('');

    // 2. Remove thickness and final_thickness from individual_products collection
    console.log('📦 Removing thickness and final_thickness fields from individual products...');
    const individualProductsResult = await db.collection('individual_products').updateMany(
      {},
      { $unset: { thickness: "", final_thickness: "" } }
    );
    console.log(`   ✅ Updated ${individualProductsResult.modifiedCount} individual products`);
    console.log(`   📊 Matched ${individualProductsResult.matchedCount} individual products`);
    console.log('');

    // 3. First, ensure "test" subcategory exists in dropdown_options (before updating product)
    console.log('🔍 Checking if "test" subcategory exists in dropdown options...');
    const existingSubcategory = await DropdownOption.findOne({ 
      category: 'subcategory', 
      value: 'test' 
    });
    
    if (!existingSubcategory) {
      console.log('   ➕ Adding "test" subcategory to dropdown options...');
      const newSubcategory = new DropdownOption({
        id: await generateId('OPT'),
        category: 'subcategory',
        value: 'test',
        display_order: 999,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await newSubcategory.save();
      console.log('   ✅ Added "test" subcategory to dropdown options');
    } else {
      console.log('   ✅ "test" subcategory already exists in dropdown options');
    }
    console.log('');

    // 4. Now find product named "test" and add subcategory "test" (after dropdown is ready)
    console.log('🔍 Finding product named "test"...');
    const testProduct = await Product.findOne({ name: "test" });
    
    if (testProduct) {
      console.log(`   ✅ Found product: ${testProduct.name} (ID: ${testProduct.id})`);
      console.log(`   📝 Current subcategory: ${testProduct.subcategory || '(empty)'}`);
      
      // Update subcategory to "test" (now that it exists in dropdown)
      testProduct.subcategory = "test";
      await testProduct.save();
      
      console.log(`   ✅ Updated subcategory to: ${testProduct.subcategory}`);
    } else {
      console.log('   ⚠️  No product named "test" found');
      
      // Check if there are any products with "test" in the name (case-insensitive)
      const testProducts = await Product.find({ 
        name: { $regex: /test/i } 
      });
      
      if (testProducts.length > 0) {
        console.log(`   📋 Found ${testProducts.length} product(s) with "test" in name:`);
        testProducts.forEach(p => {
          console.log(`      - ${p.name} (ID: ${p.id})`);
        });
        
        // Update the first one found
        const productToUpdate = testProducts[0];
        productToUpdate.subcategory = "test";
        await productToUpdate.save();
        console.log(`   ✅ Updated subcategory to "test" for: ${productToUpdate.name}`);
      } else {
        console.log('   ℹ️  No products with "test" in name found');
      }
    }
    console.log('');

    console.log('═'.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   - Removed thickness from ${productsResult.modifiedCount} products`);
    console.log(`   - Removed thickness/final_thickness from ${individualProductsResult.modifiedCount} individual products`);
    console.log('   - Updated subcategory for test product(s)');
    console.log('');

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run migration
removeThicknessAndAddSubcategory();

