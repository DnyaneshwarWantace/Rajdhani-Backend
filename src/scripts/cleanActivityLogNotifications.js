import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/Notification.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rajdhani';

async function cleanActivityLogNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all notifications that are activity logs
    const result = await Notification.deleteMany({
      $or: [
        { type: 'activity_log' },
        { module: 'activity' },
        { 'related_data.activity_log_id': { $exists: true } }
      ]
    });
    console.log(`✅ Deleted ${result.deletedCount} activity log notifications`);

    console.log('✅ Activity log notifications cleaned successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning activity log notifications:', error);
    process.exit(1);
  }
}

cleanActivityLogNotifications();

