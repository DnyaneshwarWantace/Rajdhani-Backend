import express from 'express';
import { 
  login, 
  register, 
  getCurrentUser, 
  logout, 
  changePassword,
  updateProfile
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes (require authentication)
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);

// Admin only routes
router.post('/register', authenticate, authorize('admin'), register);

export default router;

