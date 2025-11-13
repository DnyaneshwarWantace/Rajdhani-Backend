#!/usr/bin/env node
/**
 * Script to verify all raw materials have all required fields filled
 */

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
  type: { type: String },
  category: { type: String, required: true },
  current_stock: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true },
  min_threshold: { type: Number, required: true, default: 0 },
  max_capacity: { type: Number, required: true },
  reorder_point: { type: Number, required: true },
  daily_usage: { type: Number, default: 0 },
  status: { type: String, enum: ['in-stock', 'low-stock', 'out-of-stock', 'overstock', 'in-transit'], default: 'in-stock' },
  supplier_id: { type: String },
  supplier_name: { type: String, required: true },
  cost_per_unit: { type: Number, required: true, min: 0 },
  total_value: { type: Number, default: 0 },
  batch_number: { type: String },
  quality_grade: { type: String },
  image_url: { type: String },
  supplier_performance: { type: Number, default: 5, min: 0, max: 10 },
  last_restocked: { type: Date }
}, {
  timestamps: true,
  collection: 'raw_materials'
});

const RawMaterial = mongoose.models.RawMaterial || mongoose.model('RawMaterial', RawMaterialSchema);

async function verifyRawMaterials() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const materials = await RawMaterial.find({});
    console.log(`📦 Found ${materials.length} raw materials\n`);
    console.log('🔍 Checking all required fields...\n');

    const requiredFields = [
      'id',
      'name',
      'category',
      'current_stock',
      'unit',
      'min_threshold',
      'max_capacity',
      'reorder_point',
      'supplier_name',
      'cost_per_unit'
    ];

    const recommendedFields = [
      'type',
      'quality_grade',
      'status',
      'daily_usage',
      'supplier_performance'
    ];

    let allValid = true;
    let issues = [];

    for (const material of materials) {
      const materialIssues = [];
      
      // Check required fields
      for (const field of requiredFields) {
        const value = material[field];
        if (value === undefined || value === null || value === '') {
          materialIssues.push(`❌ Missing required field: ${field}`);
          allValid = false;
        } else if (typeof value === 'number' && isNaN(value)) {
          materialIssues.push(`❌ Invalid number for field: ${field}`);
          allValid = false;
        }
      }

      // Check recommended fields
      for (const field of recommendedFields) {
        const value = material[field];
        if (value === undefined || value === null || value === '') {
          materialIssues.push(`⚠️  Missing recommended field: ${field}`);
        }
      }

      // Check for logical issues
      if (material.reorder_point > material.max_capacity) {
        materialIssues.push(`⚠️  reorder_point (${material.reorder_point}) is greater than max_capacity (${material.max_capacity})`);
      }

      if (material.min_threshold > material.reorder_point) {
        materialIssues.push(`⚠️  min_threshold (${material.min_threshold}) is greater than reorder_point (${material.reorder_point})`);
      }

      if (material.current_stock > material.max_capacity) {
        materialIssues.push(`⚠️  current_stock (${material.current_stock}) exceeds max_capacity (${material.max_capacity})`);
      }

      if (materialIssues.length > 0) {
        console.log(`\n📋 ${material.name} (ID: ${material.id}):`);
        materialIssues.forEach(issue => console.log(`   ${issue}`));
        issues.push({ material: material.name, id: material.id, issues: materialIssues });
      } else {
        console.log(`✅ ${material.name} (ID: ${material.id}) - All fields OK`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total materials: ${materials.length}`);
    console.log(`   Materials with issues: ${issues.length}`);
    console.log(`   Materials OK: ${materials.length - issues.length}`);
    
    if (allValid && issues.length === 0) {
      console.log('\n✅ All raw materials have all required fields filled!');
    } else {
      console.log('\n⚠️  Some materials need attention (see details above)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyRawMaterials();

