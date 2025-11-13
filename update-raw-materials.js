#!/usr/bin/env node
/**
 * Script to update existing raw materials with missing required fields
 * Adds default values for reorder_point, max_capacity, and other fields
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Import RawMaterial model
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

async function updateRawMaterials() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all raw materials
    const materials = await RawMaterial.find({});
    console.log(`📦 Found ${materials.length} raw materials to check\n`);

    let updatedCount = 0;

    for (const material of materials) {
      let needsUpdate = false;
      const updates = {};

      // Set default reorder_point if missing
      if (material.reorder_point === undefined || material.reorder_point === null) {
        // Use min_threshold as reorder_point if available, otherwise default to 100
        updates.reorder_point = material.min_threshold || 100;
        needsUpdate = true;
        console.log(`  ⚠️  ${material.name}: Missing reorder_point, setting to ${updates.reorder_point}`);
      }

      // Set default max_capacity if missing
      if (material.max_capacity === undefined || material.max_capacity === null) {
        // Default to 1000 or 10x current stock, whichever is higher
        updates.max_capacity = Math.max(1000, (material.current_stock || 0) * 10);
        needsUpdate = true;
        console.log(`  ⚠️  ${material.name}: Missing max_capacity, setting to ${updates.max_capacity}`);
      }

      // Set default min_threshold if missing
      if (material.min_threshold === undefined || material.min_threshold === null) {
        updates.min_threshold = 100;
        needsUpdate = true;
        console.log(`  ⚠️  ${material.name}: Missing min_threshold, setting to ${updates.min_threshold}`);
      }

      // Set default type if missing
      if (!material.type) {
        updates.type = material.category || 'Other';
        needsUpdate = true;
        console.log(`  ⚠️  ${material.name}: Missing type, setting to ${updates.type}`);
      }

      // Set default quality_grade if missing
      if (!material.quality_grade) {
        updates.quality_grade = 'A';
        needsUpdate = true;
        console.log(`  ⚠️  ${material.name}: Missing quality_grade, setting to A`);
      }

      // Set default daily_usage if missing
      if (material.daily_usage === undefined || material.daily_usage === null) {
        updates.daily_usage = 0;
        needsUpdate = true;
      }

      // Set default supplier_performance if missing
      if (material.supplier_performance === undefined || material.supplier_performance === null) {
        updates.supplier_performance = 5;
        needsUpdate = true;
      }

      // Update status based on current stock if not set correctly
      const currentStock = material.current_stock || 0;
      const minThreshold = updates.min_threshold || material.min_threshold || 100;
      const maxCapacity = updates.max_capacity || material.max_capacity || 1000;
      
      let calculatedStatus = 'in-stock';
      if (currentStock === 0) {
        calculatedStatus = 'out-of-stock';
      } else if (currentStock <= minThreshold) {
        calculatedStatus = 'low-stock';
      } else if (currentStock >= maxCapacity * 0.9) {
        calculatedStatus = 'overstock';
      }

      if (material.status !== calculatedStatus) {
        updates.status = calculatedStatus;
        needsUpdate = true;
        console.log(`  🔄 ${material.name}: Updating status from "${material.status}" to "${calculatedStatus}"`);
      }

      // Calculate total_value
      const costPerUnit = material.cost_per_unit || 0;
      const totalValue = currentStock * costPerUnit;
      if (material.total_value !== totalValue) {
        updates.total_value = totalValue;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await RawMaterial.findOneAndUpdate(
          { id: material.id },
          { $set: updates },
          { new: true }
        );
        updatedCount++;
        console.log(`  ✅ Updated ${material.name} (ID: ${material.id})\n`);
      } else {
        console.log(`  ✓ ${material.name} - All fields present\n`);
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   - Total materials checked: ${materials.length}`);
    console.log(`   - Materials updated: ${updatedCount}`);
    console.log(`   - Materials already complete: ${materials.length - updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateRawMaterials();

