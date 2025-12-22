import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function fixIndividualProductsField() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('materialconsumptions');

    // Check current documents
    const sampleDoc = await collection.findOne({});
    console.log('📄 Sample document structure:');
    console.log(JSON.stringify(sampleDoc, null, 2));

    // Count documents without individual_product_ids
    const countWithout = await collection.countDocuments({
      individual_product_ids: { $exists: false }
    });
    console.log(`📊 Documents without individual_product_ids field: ${countWithout}`);

    // Count documents with empty individual_product_ids
    const countEmpty = await collection.countDocuments({
      individual_product_ids: { $exists: true, $size: 0 }
    });
    console.log(`📊 Documents with empty individual_product_ids array: ${countEmpty}`);

    // Add the field to all documents that don't have it
    if (countWithout > 0) {
      console.log('🔧 Adding individual_product_ids field to documents without it...');
      const result = await collection.updateMany(
        { individual_product_ids: { $exists: false } },
        { $set: { individual_product_ids: [] } }
      );
      console.log(`✅ Updated ${result.modifiedCount} documents`);
    }

    // Test: Try to insert a document with individual_product_ids
    console.log('🧪 Testing insertion with individual_product_ids...');
    const testId = `TEST-${Date.now()}`;
    const testDoc = {
      id: testId,
      production_batch_id: 'TEST-BATCH',
      production_product_id: 'TEST-BATCH',
      material_id: 'TEST-MAT',
      material_name: 'Test Material',
      material_type: 'product',
      quantity_used: 5,
      unit: 'rolls',
      individual_product_ids: ['IPD-001', 'IPD-002', 'IPD-003'],
      consumed_at: new Date()
    };

    const insertResult = await collection.insertOne(testDoc);
    console.log('✅ Test document inserted:', insertResult.insertedId);

    // Verify the test document
    const verifyDoc = await collection.findOne({ id: testId });
    console.log('🔍 Verified test document:');
    console.log('  - individual_product_ids exists:', 'individual_product_ids' in verifyDoc);
    console.log('  - individual_product_ids length:', verifyDoc.individual_product_ids?.length || 0);
    console.log('  - individual_product_ids value:', verifyDoc.individual_product_ids);

    // Clean up test document
    await collection.deleteOne({ id: testId });
    console.log('🧹 Cleaned up test document');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixIndividualProductsField();
