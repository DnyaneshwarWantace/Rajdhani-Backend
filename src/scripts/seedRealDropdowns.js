import mongoose from 'mongoose';
import DropdownOption from '../models/DropdownOption.js';
import { generateId } from '../utils/idGenerator.js';
import connectDB from '../config/database.js';

// Real dropdown data from your Supabase
const realDropdownData = [
  // Weight values
  { category: 'weight', value: '400 GSM', display_order: 1, is_active: true },
  { category: 'weight', value: '300 GSM', display_order: 2, is_active: true },
  { category: 'weight', value: '500 GSM', display_order: 3, is_active: false },
  { category: 'weight', value: '600 GSM', display_order: 4, is_active: false },
  { category: 'weight', value: '2 kg', display_order: 5, is_active: false },
  { category: 'weight', value: '5 kg', display_order: 6, is_active: true },
  { category: 'weight', value: '800 GSM', display_order: 4, is_active: false },
  { category: 'weight', value: '700 GSM', display_order: 3, is_active: false },

  // Weight units
  { category: 'weight_units', value: 'GSM', display_order: 1, is_active: true },
  { category: 'weight_units', value: 'kg', display_order: 2, is_active: true },
  { category: 'weight_units', value: 'g', display_order: 3, is_active: false },
  { category: 'weight_units', value: 'lbs', display_order: 4, is_active: true },
  { category: 'weight_units', value: 'oz', display_order: 5, is_active: false },

  // Length values
  { category: 'length', value: '148 feet', display_order: 1, is_active: true },
  { category: 'length', value: '10 feet', display_order: 2, is_active: true },
  { category: 'length', value: '15 feet', display_order: 3, is_active: true },
  { category: 'length', value: '2.5 m', display_order: 4, is_active: true },
  { category: 'length', value: '3 m', display_order: 5, is_active: true },
  { category: 'length', value: '45 meter', display_order: 2, is_active: true },
  { category: 'length', value: '5 feet', display_order: 1, is_active: true },

  // Length units
  { category: 'length_units', value: 'feet', display_order: 1, is_active: true },
  { category: 'length_units', value: 'm', display_order: 2, is_active: true },
  { category: 'length_units', value: 'mm', display_order: 4, is_active: true },

  // Width values
  { category: 'width', value: '5 feet', display_order: 1, is_active: true },
  { category: 'width', value: '10 feet', display_order: 2, is_active: true },
  { category: 'width', value: '15 feet', display_order: 3, is_active: true },
  { category: 'width', value: '1.5 m', display_order: 4, is_active: true },
  { category: 'width', value: '2 m', display_order: 5, is_active: true },
  { category: 'width', value: '3.05 meter', display_order: 6, is_active: true },
  { category: 'width', value: '1.25 meter', display_order: 4, is_active: true },
  { category: 'width', value: '1.83 meter', display_order: 5, is_active: true },
  { category: 'width', value: '6 feet', display_order: 2, is_active: true },

  // Width units
  { category: 'width_units', value: 'feet', display_order: 1, is_active: true },
  { category: 'width_units', value: 'm', display_order: 2, is_active: true },
  { category: 'width_units', value: 'cm', display_order: 3, is_active: true },
  { category: 'width_units', value: 'mm', display_order: 4, is_active: true },
  { category: 'width_units', value: 'inches', display_order: 5, is_active: true },

  // Thickness values
  { category: 'thickness', value: '15 mm', display_order: 1, is_active: true },
  { category: 'thickness', value: '20 mm', display_order: 2, is_active: true },
  { category: 'thickness', value: '25 mm', display_order: 3, is_active: true },
  { category: 'thickness', value: '1.5 cm', display_order: 4, is_active: true },
  { category: 'thickness', value: '12mm', display_order: 5, is_active: true },
  { category: 'thickness', value: '15mm', display_order: 6, is_active: true },
  { category: 'thickness', value: '8mm', display_order: 2, is_active: true },
  { category: 'thickness', value: '10mm', display_order: 3, is_active: true },
  { category: 'thickness', value: '5mm', display_order: 1, is_active: true },
  { category: 'thickness', value: '3 mm', display_order: 999, is_active: true },

  // Thickness units
  { category: 'thickness_units', value: 'mm', display_order: 1, is_active: true },
  { category: 'thickness_units', value: 'cm', display_order: 2, is_active: true },
  { category: 'thickness_units', value: 'm', display_order: 4, is_active: true },

  // Product categories
  { category: 'category', value: 'degital print', display_order: 2, is_active: true },
  { category: 'category', value: 'backing', display_order: 3, is_active: true },
  { category: 'category', value: 'felt', display_order: 4, is_active: true },
  { category: 'category', value: 'raw material', display_order: 5, is_active: true },

  // Product colors
  { category: 'color', value: 'Blue', display_order: 2, is_active: true },
  { category: 'color', value: 'Green', display_order: 3, is_active: true },
  { category: 'color', value: 'Black', display_order: 5, is_active: true },
  { category: 'color', value: 'White', display_order: 6, is_active: true },
  { category: 'color', value: 'Brown', display_order: 7, is_active: true },
  { category: 'color', value: 'Gray', display_order: 8, is_active: true },
  { category: 'color', value: 'NA', display_order: 10, is_active: true },

  // Product patterns
  { category: 'pattern', value: 'Persian Medallion', display_order: 1, is_active: true },
  { category: 'pattern', value: 'Geometric', display_order: 2, is_active: true },
  { category: 'pattern', value: 'Floral', display_order: 3, is_active: true },
  { category: 'pattern', value: 'Abstract', display_order: 4, is_active: true },
  { category: 'pattern', value: 'Traditional', display_order: 5, is_active: true },
  { category: 'pattern', value: 'Modern', display_order: 6, is_active: true },
  { category: 'pattern', value: 'Standard', display_order: 8, is_active: true },
  { category: 'pattern', value: 'RD-1009', display_order: 999, is_active: true },

  // Product units
  { category: 'unit', value: 'roll', display_order: 1, is_active: true },
  { category: 'unit', value: 'GSM', display_order: 2, is_active: true },

  // Material categories
  { category: 'material_category', value: 'Yarn', display_order: 1, is_active: true },
  { category: 'material_category', value: 'Chemical', display_order: 3, is_active: true },
  { category: 'material_category', value: 'Fabric', display_order: 4, is_active: true },
  { category: 'material_category', value: 'Thread', display_order: 5, is_active: true },
  { category: 'material_category', value: 'Fiber', display_order: 6, is_active: true },
  { category: 'material_category', value: 'Coating', display_order: 7, is_active: true },
  { category: 'material_category', value: 'Adhesive', display_order: 8, is_active: true },

  // Material units
  { category: 'material_unit', value: 'rolls', display_order: 1, is_active: true },
  { category: 'material_unit', value: 'liters', display_order: 2, is_active: true },
  { category: 'material_unit', value: 'kg', display_order: 3, is_active: true },
  { category: 'material_unit', value: 'pieces', display_order: 5, is_active: true },
  { category: 'material_unit', value: 'gallons', display_order: 8, is_active: true },
  { category: 'material_unit', value: 'pounds', display_order: 9, is_active: true },
  { category: 'material_unit', value: 'yards', display_order: 10, is_active: true },
  { category: 'material_unit', value: 'tons', display_order: 7, is_active: true },

  // Quality grades
  { category: 'quality_grade', value: 'A', display_order: 1, is_active: true },
  { category: 'quality_grade', value: 'C', display_order: 3, is_active: true },
  { category: 'quality_grade', value: 'D', display_order: 4, is_active: true },

  // Quality ratings
  { category: 'quality_rating', value: 'A+', display_order: 1, is_active: true },
  { category: 'quality_rating', value: 'A', display_order: 2, is_active: true },
  { category: 'quality_rating', value: 'B', display_order: 3, is_active: true },
  { category: 'quality_rating', value: 'D', display_order: 5, is_active: true },

  // Priorities
  { category: 'priority', value: 'low', display_order: 1, is_active: true },
  { category: 'priority', value: 'normal', display_order: 2, is_active: true },
  { category: 'priority', value: 'high', display_order: 3, is_active: true },
  { category: 'priority', value: 'urgent', display_order: 4, is_active: true },

  // Waste types
  { category: 'waste_type', value: 'scrap', display_order: 1, is_active: true },
  { category: 'waste_type', value: 'excess', display_order: 3, is_active: true },
  { category: 'waste_type', value: 'damaged_material', display_order: 3, is_active: true },
  { category: 'waste_type', value: 'production_scrap', display_order: 5, is_active: true }
];

const seedRealDropdowns = async () => {
  try {
    console.log('🌱 Starting real dropdown seed...');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing dropdown options...');
    await DropdownOption.deleteMany({});

    // Prepare data with IDs
    const dataWithIds = realDropdownData.map(item => ({
      ...item,
      id: generateId('OPT'),
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Insert seed data
    console.log(`📝 Inserting ${dataWithIds.length} dropdown options...`);
    await DropdownOption.insertMany(dataWithIds);

    console.log('✅ Real dropdown seed completed successfully!');
    console.log(`\n📊 Summary:`);
    
    // Count by category
    const categoryCounts = {};
    realDropdownData.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    console.log(`   - Total options: ${dataWithIds.length}`);
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} options`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding real dropdowns:', error);
    process.exit(1);
  }
};

// Run seed
seedRealDropdowns();
