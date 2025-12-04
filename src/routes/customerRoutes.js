import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getCustomerOrders,
  updateCustomerStatus,
  updateCreditLimit
} from '../controllers/customerController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for customer routes
console.log('🔧 Customer routes: Setting up checkPageAccess middleware');
router.use((req, res, next) => {
  console.log(`🔧 Customer route middleware: ${req.method} ${req.path}`);
  return checkPageAccess('customers')(req, res, next);
});

// Customer CRUD routes with action permissions
router.post('/', checkPermission('customer_create'), createCustomer);
router.get('/', checkPermission('customer_view'), getCustomers);
router.get('/stats', checkPermission('customer_view'), getCustomerStats);
router.get('/:id', checkPermission('customer_view'), getCustomerById);
router.get('/:id/orders', checkPermission('customer_view'), getCustomerOrders);
router.put('/:id', checkPermission('customer_edit'), updateCustomer);
router.patch('/:id/status', checkPermission('customer_edit'), updateCustomerStatus);
router.patch('/:id/credit-limit', checkPermission('customer_edit'), updateCreditLimit);
router.delete('/:id', checkPermission('customer_delete'), deleteCustomer);

export default router;
