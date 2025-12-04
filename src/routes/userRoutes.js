import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword,
  updateUserStatus
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and admin role (settings page is admin-only)
router.use(authenticate);
router.use(authorize('admin'));

// Get all users
router.get('/', getUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Reset user password
router.post('/:id/reset-password', resetPassword);

// Update user status
router.patch('/:id/status', updateUserStatus);

export default router;

