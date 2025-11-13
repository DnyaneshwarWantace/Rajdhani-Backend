import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword,
  updateUserStatus
} from '../controllers/userController.js';
import { authenticate, authorize, checkPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all users (requires user_view permission)
router.get('/', checkPermission('user_view'), getUsers);

// Get user by ID (requires user_view permission)
router.get('/:id', checkPermission('user_view'), getUserById);

// Update user (requires user_edit permission)
router.put('/:id', checkPermission('user_edit'), updateUser);

// Delete user (requires user_delete permission)
router.delete('/:id', checkPermission('user_delete'), deleteUser);

// Reset user password (Admin only)
router.post('/:id/reset-password', authorize('admin'), resetPassword);

// Update user status (requires user_edit permission)
router.patch('/:id/status', checkPermission('user_edit'), updateUserStatus);

export default router;

