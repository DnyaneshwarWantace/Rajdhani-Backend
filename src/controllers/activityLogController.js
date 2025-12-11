import ActivityLog from '../models/ActivityLog.js';
import { escapeRegex } from '../utils/regexHelper.js';

// Get activity logs with filtering and pagination
export const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      user_email,
      action,
      action_category,
      method,
      status_code,
      search,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};

    if (user_id) filter.user_id = user_id;
    if (user_email) {
      const escapedEmail = escapeRegex(user_email);
      filter.user_email = { $regex: escapedEmail, $options: 'i' };
    }
    if (action) filter.action = action;
    if (action_category) filter.action_category = action_category;
    if (method) filter.method = method;
    if (status_code) filter.status_code = parseInt(status_code);

    // Search across multiple fields
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { user_name: { $regex: escapedSearch, $options: 'i' } },
        { user_email: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { endpoint: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    // Date range filter
    if (start_date || end_date) {
      filter.created_at = {};
      if (start_date) filter.created_at.$gte = new Date(start_date);
      if (end_date) filter.created_at.$lte = new Date(end_date);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    // Get total count
    const total = await ActivityLog.countDocuments(filter);

    // Get logs
    const logs = await ActivityLog.find(filter)
      .sort({ [sort_by]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
};

// Get single activity log by ID
export const getActivityLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await ActivityLog.findById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Activity log not found'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity log'
    });
  }
};

// Get activity statistics
export const getActivityStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Build date filter
    const dateFilter = {};
    if (start_date || end_date) {
      dateFilter.created_at = {};
      if (start_date) dateFilter.created_at.$gte = new Date(start_date);
      if (end_date) dateFilter.created_at.$lte = new Date(end_date);
    }

    // Get statistics
    const [
      totalLogs,
      actionCategoryStats,
      userStats,
      methodStats,
      statusCodeStats,
      recentActivity
    ] = await Promise.all([
      // Total logs count
      ActivityLog.countDocuments(dateFilter),

      // Logs by action category
      ActivityLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action_category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Most active users
      ActivityLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { user_id: '$user_id', user_name: '$user_name', user_role: '$user_role' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Logs by HTTP method
      ActivityLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$method', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Logs by status code
      ActivityLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status_code', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Recent activity (last 24 hours)
      ActivityLog.countDocuments({
        ...dateFilter,
        created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Calculate success rate
    const successLogs = await ActivityLog.countDocuments({
      ...dateFilter,
      status_code: { $lt: 400 }
    });
    const successRate = totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0;

    // Calculate error rate
    const errorLogs = await ActivityLog.countDocuments({
      ...dateFilter,
      status_code: { $gte: 400 }
    });
    const errorRate = totalLogs > 0 ? ((errorLogs / totalLogs) * 100).toFixed(2) : 0;

    // Calculate average response time
    const avgResponseTime = await ActivityLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, avg: { $avg: '$response_time' } } }
    ]);

    res.json({
      success: true,
      data: {
        total_logs: totalLogs,
        recent_activity_24h: recentActivity,
        success_rate: parseFloat(successRate),
        error_rate: parseFloat(errorRate),
        avg_response_time: avgResponseTime[0]?.avg?.toFixed(2) || 0,
        by_category: actionCategoryStats.map(stat => ({
          category: stat._id,
          count: stat.count
        })),
        by_method: methodStats.map(stat => ({
          method: stat._id,
          count: stat.count
        })),
        by_status_code: statusCodeStats.map(stat => ({
          status_code: stat._id,
          count: stat.count
        })),
        top_users: userStats.map(stat => ({
          user_id: stat._id.user_id,
          user_name: stat._id.user_name,
          user_role: stat._id.user_role,
          activity_count: stat.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity statistics'
    });
  }
};

// Clear old logs (older than specified days)
export const clearOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await ActivityLog.deleteMany({
      created_at: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      data: {
        deleted_count: result.deletedCount,
        message: `Deleted logs older than ${days} days`
      }
    });
  } catch (error) {
    console.error('Error clearing old logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear old logs'
    });
  }
};
