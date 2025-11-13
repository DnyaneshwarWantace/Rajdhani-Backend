import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrderStats,
  updateOrderStatus,
  approvePurchaseOrder,
  markAsDelivered
} from '../controllers/purchaseOrderController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for purchase order routes (related to materials)
router.use(checkPageAccess('materials'));

// Purchase order routes with action permissions
router.post('/', checkPermission('material_create'), createPurchaseOrder);
router.get('/', checkPermission('material_view'), getPurchaseOrders);
router.get('/stats', checkPermission('material_view'), getPurchaseOrderStats);
router.get('/:id', checkPermission('material_view'), getPurchaseOrderById);
router.put('/:id', checkPermission('material_edit'), updatePurchaseOrder);
router.put('/:orderId/status', checkPermission('material_edit'), updateOrderStatus);
router.post('/:id/approve', checkPermission('material_edit'), approvePurchaseOrder);
router.post('/:id/deliver', checkPermission('material_edit'), markAsDelivered);
router.delete('/:id', checkPermission('material_delete'), deletePurchaseOrder);

export default router;
