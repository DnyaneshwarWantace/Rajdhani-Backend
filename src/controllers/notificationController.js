import Notification from '../models/Notification.js';
import { generateId } from '../utils/idGenerator.js';

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const notificationData = {
      id: await generateId('NOTIF'),
      ...req.body
    };

    const notification = new Notification(notificationData);
    await notification.save();

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      details: error.message
    });
  }
};

// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const { module, status, type, limit = 50, offset = 0 } = req.query;
    
    let query = {};
    
    if (module) query.module = module;
    if (status) query.status = status;
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: notifications,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({ id });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification',
      details: error.message
    });
  }
};

// Update notification (partial update)
const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate status if provided
    if (updates.status && !['unread', 'read', 'dismissed'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be unread, read, or dismissed'
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification',
      details: error.message
    });
  }
};

// Update notification status
const updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['unread', 'read', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be unread, read, or dismissed'
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { id },
      { status },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification status updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification status',
      details: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOneAndDelete({ id });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      details: error.message
    });
  }
};

// Check if notification exists
const checkNotificationExists = async (req, res) => {
  try {
    const { type, related_id, status = 'unread' } = req.query;
    
    const notification = await Notification.findOne({
      type,
      related_id,
      status
    });

    res.json({
      success: true,
      exists: !!notification
    });
  } catch (error) {
    console.error('Error checking notification existence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check notification existence',
      details: error.message
    });
  }
};

// Get notification counts by module
const getNotificationCounts = async (req, res) => {
  try {
    const counts = await Notification.aggregate([
      {
        $group: {
          _id: { module: '$module', status: '$status' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.module',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification counts',
      details: error.message
    });
  }
};

export {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  updateNotificationStatus,
  deleteNotification,
  checkNotificationExists,
  getNotificationCounts
};
