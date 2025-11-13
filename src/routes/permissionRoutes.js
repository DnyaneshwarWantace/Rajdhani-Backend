import express from 'express';
import {
  getAllPermissions,
  getPermissionsByRole,
  updatePermissions,
  resetPermissions,
  getAvailableRoles,
  getAvailablePages,
  getAvailableActions
} from '../controllers/permissionController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all permissions
router.get('/', getAllPermissions);

// Get permissions by role
router.get('/role/:role', getPermissionsByRole);

// Update permissions for a role
router.put('/role/:role', updatePermissions);

// Reset permissions to default for a role
router.post('/role/:role/reset', resetPermissions);

// Get available roles
router.get('/meta/roles', getAvailableRoles);

// Get available pages
router.get('/meta/pages', getAvailablePages);

// Get available actions
router.get('/meta/actions', getAvailableActions);

export default router;

