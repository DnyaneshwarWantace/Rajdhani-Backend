import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Supplier from '../models/Supplier.js';
import { generateSupplierId } from '../utils/idGenerator.js';
import { connectDB } from '../config/database.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

// Supplier data with realistic information for Gurgaon/Delhi NCR
const suppliersData = [
  {
    name: 'Mahalakshmi',
    contact_person: 'Rajesh Kumar',
    email: 'contact@mahalakshmitraders.com',
    phone: '+91-9876543210',
    address: 'Shop No. 45, Sector 18, Market Complex',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122015',
    gst_number: '06AABCU1234M1Z5',
    performance_rating: 8,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  },
  {
    name: 'Nirmal',
    contact_person: 'Vikram Singh',
    email: 'info@nirmalexports.com',
    phone: '+91-9876543211',
    address: 'Plot No. 12, Industrial Area, Phase 2',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122015',
    gst_number: '06AABCN5678M2Z6',
    performance_rating: 7,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  },
  {
    name: 'Pashupati',
    contact_person: 'Amit Sharma',
    email: 'sales@pashupaticarpets.com',
    phone: '+91-9876543212',
    address: 'Ground Floor, DLF Cyber Hub, Building 5',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122002',
    gst_number: '06AABCP9012M3Z7',
    performance_rating: 9,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  },
  {
    name: 'BLS',
    contact_person: 'Priya Mehta',
    email: 'contact@blstextiles.com',
    phone: '+91-9876543213',
    address: 'Unit 23, Udyog Vihar, Phase 4',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122016',
    gst_number: '06AABCB3456M4Z8',
    performance_rating: 8,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  },
  {
    name: 'Dharmesh GPL',
    contact_person: 'Dharmesh Patel',
    email: 'dharmesh@gplindustries.com',
    phone: '+91-9876543214',
    address: 'SCO 45, Sector 29, Main Market',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122001',
    gst_number: '06AABDG7890M5Z9',
    performance_rating: 7,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  },
  {
    name: 'RPG',
    contact_person: 'Rohit Gupta',
    email: 'info@rpgcarpets.com',
    phone: '+91-9876543215',
    address: 'Shop No. 78, MG Road, Near Metro Station',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122001',
    gst_number: '06AABRG2345M6Z1',
    performance_rating: 8,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  },
  {
    name: 'Safar',
    contact_person: 'Mohammed Ali',
    email: 'sales@safartextiles.com',
    phone: '+91-9876543216',
    address: 'Plot No. 56, Sector 63, Noida',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    gst_number: '09AABSF6789M7Z2',
    performance_rating: 6,
    total_orders: 0,
    total_value: 0,
    status: 'active'
  }
];

const seedSuppliers = async () => {
  try {
    console.log('🔄 Starting supplier seeding...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;

    for (const supplierData of suppliersData) {
      try {
        // Check if supplier already exists
        const existingSupplier = await Supplier.findOne({ name: supplierData.name });
        
        if (existingSupplier) {
          console.log(`⏭️  Supplier "${supplierData.name}" already exists, skipping...`);
          skipped++;
          continue;
        }

        // Generate unique supplier ID
        const supplierId = await generateSupplierId();
        
        // Create supplier
        const supplier = new Supplier({
          id: supplierId,
          ...supplierData
        });

        await supplier.save();
        console.log(`✅ Created supplier: ${supplierData.name} (${supplierId})`);
        console.log(`   📍 ${supplierData.address}, ${supplierData.city}`);
        console.log(`   📞 ${supplierData.phone} | 📧 ${supplierData.email}`);
        console.log(`   🏆 Rating: ${supplierData.performance_rating}/10`);
        console.log('');
        created++;
      } catch (error) {
        console.error(`❌ Error creating supplier "${supplierData.name}":`, error.message);
      }
    }

    console.log('═'.repeat(60));
    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created} suppliers`);
    console.log(`   ⏭️  Skipped: ${skipped} suppliers (already exist)`);
    console.log('═'.repeat(60));
    console.log('');
    console.log('🎉 Supplier seeding completed!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('💡 MongoDB connection failed. Please check:');
      console.error('   1. MongoDB is running');
      console.error('   2. MONGODB_URI in .env is correct');
      console.error('   3. Network connection is working');
      console.error('');
      console.error('Current MONGODB_URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    }
    process.exit(1);
  }
};

// Run the script
console.log('');
console.log('═'.repeat(60));
console.log('🏭 RAJDHANI - SUPPLIER SEEDING');
console.log('═'.repeat(60));
console.log('');

seedSuppliers();

