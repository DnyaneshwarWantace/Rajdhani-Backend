import express from 'express';
import {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  updateNotificationStatus,
  deleteNotification,
  checkNotificationExists,
  getNotificationCounts
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
// Notifications are accessible to all authenticated users (they're user-specific)
router.use(authenticate);

// Create a new notification
router.post('/', createNotification);

// Get all notifications with optional filters (user can only see their own)
router.get('/', getNotifications);

// Get notification counts by module
router.get('/counts', getNotificationCounts);

// Check if notification exists
router.get('/exists', checkNotificationExists);

// Get notification by ID
router.get('/:id', getNotificationById);

// Update notification (partial update)
router.put('/:id', updateNotification);

// Update notification status
router.patch('/:id/status', updateNotificationStatus);

// Delete notification
router.delete('/:id', deleteNotification);

export default router;
