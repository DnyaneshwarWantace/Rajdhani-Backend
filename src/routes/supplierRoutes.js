import express from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierStats
} from '../controllers/supplierController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for supplier routes
router.use(checkPageAccess('suppliers'));

// Supplier CRUD routes with action permissions
router.post('/', checkPermission('supplier_create'), createSupplier);
router.get('/', checkPermission('supplier_view'), getSuppliers);
router.get('/:id', checkPermission('supplier_view'), getSupplierById);
router.get('/:id/stats', checkPermission('supplier_view'), getSupplierStats);
router.put('/:id', checkPermission('supplier_edit'), updateSupplier);
router.delete('/:id', checkPermission('supplier_delete'), deleteSupplier);

export default router;
