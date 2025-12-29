import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  getOrderStats,
  deleteOrder,
  updateOrderItemIndividualProducts,
  updateOrderPayment,
  updateOrderGST,
  testStockDeduction,
  saveIndividualProductSelection
} from '../controllers/orderController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for all order routes
router.use(checkPageAccess('orders'));

// Order CRUD routes with action permissions
router.post('/', checkPermission('order_create'), createOrder);
router.get('/', checkPermission('order_view'), getOrders);
router.get('/stats', checkPermission('order_view'), getOrderStats);
router.get('/:id', checkPermission('order_view'), getOrderById);
router.put('/:id', checkPermission('order_edit'), updateOrder);
router.patch('/:id/status', checkPermission('order_edit'), updateOrderStatus);
router.patch('/:id/payment', checkPermission('order_edit'), updateOrderPayment);
router.patch('/:id/gst', checkPermission('order_edit'), updateOrderGST);
router.delete('/:id', checkPermission('order_delete'), deleteOrder);

// Order item management routes
router.post('/:order_id/items', checkPermission('order_edit'), addOrderItem);
router.put('/items/:item_id', checkPermission('order_edit'), updateOrderItem);
router.patch('/items/:item_id/individual-products', checkPermission('order_edit'), updateOrderItemIndividualProducts);
router.delete('/items/:item_id', checkPermission('order_edit'), removeOrderItem);

// Individual product selection for order items
router.post('/items/save-individual-products', checkPermission('order_edit'), saveIndividualProductSelection);

// Test route for stock deduction (requires order_edit permission)
router.post('/:orderId/test-stock-deduction', checkPermission('order_edit'), testStockDeduction);

export default router;
