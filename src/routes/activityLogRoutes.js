import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import {
  getActivityLogs,
  getActivityLogById,
  getActivityStats,
  clearOldLogs
} from '../controllers/activityLogController.js';

const router = express.Router();

// All activity log routes are admin-only
router.use(authenticate);
router.use(authorize('admin'));

// Get activity logs with filtering and pagination
router.get('/', getActivityLogs);

// Get activity log by ID
router.get('/:id', getActivityLogById);

// Get activity statistics
router.get('/stats/overview', getActivityStats);

// Clear old logs (optional - for cleanup)
router.delete('/cleanup/old', clearOldLogs);

export default router;
