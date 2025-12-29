import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { generateId } from '../utils/idGenerator.js';

// Create a new notification
const createNotification = async (req, res) => {
  try {
    // Validate required fields
    const { type, title, message, priority, status, module } = req.body;
    
    if (!type || !title || !message || !priority || !status || !module) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'type, title, message, priority, status, and module are required'
      });
    }

    // Validate module enum
    const validModules = ['orders', 'products', 'materials', 'production'];
    if (!validModules.includes(module)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid module value',
        details: `Module must be one of: ${validModules.join(', ')}. Received: ${module}`
      });
    }

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
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const { module, status, type, limit = 1000, offset = 0 } = req.query;

    let query = {};

    if (module) query.module = module;
    if (status) query.status = status;
    if (type) query.type = type;

    // Fetch regular notifications
    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Fetch activity logs and convert them to notification format
    const activityLogs = await ActivityLog.find({})
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();

    // Convert activity logs to notification format
    const activityNotifications = activityLogs.map(log => {
      // Map action category to module
      let notificationModule = 'production';
      if (log.action_category === 'MATERIAL' || log.action_category === 'PURCHASE_ORDER') {
        notificationModule = 'materials';
      } else if (log.action_category === 'PRODUCT') {
        notificationModule = 'products';
      } else if (log.action_category === 'ORDER') {
        notificationModule = 'orders';
      } else if (log.action_category === 'PRODUCTION' || log.action_category === 'RECIPE') {
        notificationModule = 'production';
      }

      return {
        id: `activity_${log._id}`,
        type: 'activity_log',
        title: log.description || `${log.action} - ${log.action_category}`,
        message: log.description || '',
        priority: 'medium',
        status: 'read', // Activity logs are marked as read by default
        module: notificationModule,
        related_id: log.target_resource || log._id.toString(),
        related_data: {
          activity_log_id: log._id,
          action: log.action,
          action_category: log.action_category,
          description: log.description,
          user_name: log.user_name,
          user_email: log.user_email,
          user_role: log.user_role,
          metadata: log.metadata,
          changes: log.changes,
          target_resource: log.target_resource,
          target_resource_type: log.target_resource_type,
          method: log.method,
          endpoint: log.endpoint,
          status_code: log.status_code,
          created_at: log.created_at,
          created_by_user: log.user_name
        },
        created_by: log.user_name || 'System',
        created_at: log.created_at,
        updated_at: log.created_at
      };
    });

    // Combine both arrays
    const allNotifications = [...notifications, ...activityNotifications];

    // Sort combined array by created_at
    allNotifications.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = await Notification.countDocuments(query) + activityLogs.length;

    res.json({
      success: true,
      data: allNotifications,
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
