import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ActivityLog from '../models/ActivityLog.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function cleanActivityLogs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all activity logs
    const result = await ActivityLog.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} activity logs`);

    console.log('✅ Activity logs cleaned successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning activity logs:', error);
    process.exit(1);
  }
}

cleanActivityLogs();

