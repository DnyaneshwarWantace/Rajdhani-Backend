import express from 'express';
import {
  createRawMaterial,
  getRawMaterials,
  getRawMaterialById,
  updateRawMaterial,
  deleteRawMaterial,
  getInventoryStats,
  getMaterialsRequiringReorder,
  adjustStock,
  getStockHistory,
  getStockStatus,
  getMaterialDropdownData,
  getMaterialOrders
} from '../controllers/rawMaterialController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for all material routes
router.use(checkPageAccess('materials'));

// Raw material CRUD routes with action permissions
router.post('/', checkPermission('material_create'), createRawMaterial);
router.get('/', checkPermission('material_view'), getRawMaterials);
router.get('/stats', checkPermission('material_view'), getInventoryStats);
router.get('/status', checkPermission('material_view'), getStockStatus);
router.get('/reorder', checkPermission('material_view'), getMaterialsRequiringReorder);
router.get('/dropdown-data', checkPermission('material_view'), getMaterialDropdownData);
router.get('/:id/history', checkPermission('material_view'), getStockHistory);
router.get('/:id/orders', checkPermission('material_view'), getMaterialOrders);
router.get('/:id', checkPermission('material_view'), getRawMaterialById);
router.put('/:id', checkPermission('material_edit'), updateRawMaterial);
router.post('/:id/adjust-stock', checkPermission('material_restock'), adjustStock);
router.delete('/:id', checkPermission('material_delete'), deleteRawMaterial);

export default router;
