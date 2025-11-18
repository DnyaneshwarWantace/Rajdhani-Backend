import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import IndividualProduct from './src/models/IndividualProduct.js';
import { connectDB } from './src/config/database.js';

dotenv.config();

const verifyDeletion = async () => {
  try {
    console.log('🔍 Verifying product deletion...\n');
    
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Check products
    const productCount = await Product.countDocuments({});
    console.log(`📊 Products in database: ${productCount}`);
    
    if (productCount > 0) {
      console.log('\n⚠️  Found products still in database. Listing them:');
      const products = await Product.find({}).limit(10).select('id name category');
      products.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (${p.category}) - ID: ${p.id}`);
      });
      if (productCount > 10) {
        console.log(`   ... and ${productCount - 10} more`);
      }
      
      console.log('\n🗑️  Deleting all remaining products...');
      const deleted = await Product.deleteMany({});
      console.log(`   ✅ Deleted ${deleted.deletedCount} products\n`);
    } else {
      console.log('✅ No products found - database is clean!\n');
    }
    
    // Check individual products
    const individualCount = await IndividualProduct.countDocuments({});
    console.log(`📊 Individual Products in database: ${individualCount}`);
    
    if (individualCount > 0) {
      console.log('\n🗑️  Deleting all remaining individual products...');
      const deleted = await IndividualProduct.deleteMany({});
      console.log(`   ✅ Deleted ${deleted.deletedCount} individual products\n`);
    }
    
    // Final count
    const finalProductCount = await Product.countDocuments({});
    const finalIndividualCount = await IndividualProduct.countDocuments({});
    
    console.log('═'.repeat(60));
    console.log('📊 FINAL VERIFICATION');
    console.log('═'.repeat(60));
    console.log(`   Products: ${finalProductCount}`);
    console.log(`   Individual Products: ${finalIndividualCount}`);
    console.log('═'.repeat(60));
    console.log('');
    
    if (finalProductCount === 0 && finalIndividualCount === 0) {
      console.log('✅ Database is completely clean!');
    } else {
      console.log('⚠️  Some products still exist. Please check manually.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
};

verifyDeletion();

