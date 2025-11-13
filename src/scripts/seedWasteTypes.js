import mongoose from 'mongoose';
import DropdownOption from '../models/DropdownOption.js';
import { generateId } from '../utils/idGenerator.js';
import { connectDB } from '../config/database.js';

// Basic waste types
const wasteTypes = [
  { category: 'waste_type', value: 'Scrap', display_order: 1, is_active: true },
  { category: 'waste_type', value: 'Defective', display_order: 2, is_active: true },
  { category: 'waste_type', value: 'Excess', display_order: 3, is_active: true }
];

const seedWasteTypes = async () => {
  try {
    console.log('🌱 Starting waste types seed...');

    // Connect to database
    await connectDB();

    // First, remove all existing waste types
    console.log('\n🗑️  Removing all existing waste types...');
    const deleteResult = await DropdownOption.deleteMany({ category: 'waste_type' });
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} existing waste types`);

    // Now add only the 3 basic waste types
    let addedCount = 0;

    for (const wasteType of wasteTypes) {
      // Create new option
      const newOption = new DropdownOption({
        id: await generateId('OPT'),
        category: wasteType.category,
        value: wasteType.value,
        display_order: wasteType.display_order,
        is_active: wasteType.is_active,
        created_at: new Date(),
        updated_at: new Date()
      });

      await newOption.save();
      console.log(`✅ Added "${wasteType.value}" waste type`);
      addedCount++;
    }

    console.log('\n✅ Waste types seed completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Deleted: ${deleteResult.deletedCount} old waste types`);
    console.log(`   - Added: ${addedCount} new waste types`);
    console.log(`   - Total: ${wasteTypes.length} waste types`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding waste types:', error);
    process.exit(1);
  }
};

// Run seed
seedWasteTypes();

