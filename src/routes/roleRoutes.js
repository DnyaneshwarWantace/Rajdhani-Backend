import express from 'express';
import {
  getAllRoles,
  getActiveRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/roleController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for all role routes
router.use(checkPageAccess('roles'));

// Get all roles (including inactive)
router.get('/', checkPermission('role_view'), getAllRoles);

// Get active roles only (for dropdowns)
router.get('/active', checkPermission('role_view'), getActiveRoles);

// Get role by ID
router.get('/:id', checkPermission('role_view'), getRoleById);

// Create new role
router.post('/', checkPermission('role_create'), createRole);

// Update role
router.put('/:id', checkPermission('role_edit'), updateRole);

// Delete role
router.delete('/:id', checkPermission('role_delete'), deleteRole);

export default router;

