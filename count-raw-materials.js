import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

const RawMaterialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  current_stock: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true },
  supplier_name: { type: String, required: true },
  cost_per_unit: { type: Number, required: true, min: 0 }
}, {
  timestamps: true,
  collection: 'raw_materials'
});

const RawMaterial = mongoose.models.RawMaterial || mongoose.model('RawMaterial', RawMaterialSchema);

async function countRawMaterials() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const count = await RawMaterial.countDocuments();
    
    console.log('═'.repeat(60));
    console.log('RAW MATERIALS COUNT');
    console.log('═'.repeat(60));
    console.log(`\n📊 Total Raw Materials: ${count}\n`);

    if (count > 0) {
      // Get some additional stats
      const byCategory = await RawMaterial.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      console.log('📋 Breakdown by Category:');
      byCategory.forEach(item => {
        console.log(`   ${item._id || '(No category)'}: ${item.count}`);
      });
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error counting raw materials:', error);
    process.exit(1);
  }
}

countRawMaterials();

