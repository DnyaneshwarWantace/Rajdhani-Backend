import express from 'express';
import {
  login,
  register,
  getCurrentUser,
  logout,
  changePassword,
  updateProfile,
  requestLoginOTP,
  verifyOTP,
  forgotPasswordRequest,
  forgotPasswordReset,
  createUser,
  getAllUsers,
  deleteUser,
  updateUserStatus,
  getUserById,
  updateUser,
  resetUserPassword
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login); // Email + Password login (direct, no OTP)
router.post('/login-otp/request', requestLoginOTP); // Optional: Request OTP for login
router.post('/login-otp/verify', verifyOTP); // Optional: Verify OTP and login
router.post('/forgot-password/request', forgotPasswordRequest); // Forgot password: Request OTP
router.post('/forgot-password/reset', forgotPasswordReset); // Forgot password: Verify OTP and reset

// Protected routes (require authentication)
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);

// Admin only routes
router.post('/register', authenticate, authorize('admin'), register); // Legacy admin registration
router.post('/admin/users', authenticate, authorize('admin'), createUser); // Create new user (admin only)
router.get('/admin/users', authenticate, authorize('admin'), getAllUsers); // Get all users (admin only)
router.get('/admin/users/:id', authenticate, authorize('admin'), getUserById); // Get user by ID (admin only)
router.put('/admin/users/:id', authenticate, authorize('admin'), updateUser); // Update user (admin only)
router.delete('/admin/users/:id', authenticate, authorize('admin'), deleteUser); // Delete user (admin only)
router.post('/admin/users/:id/reset-password', authenticate, authorize('admin'), resetUserPassword); // Reset user password (admin only)
router.patch('/admin/users/:id/status', authenticate, authorize('admin'), updateUserStatus); // Update user status (admin only)

export default router;

