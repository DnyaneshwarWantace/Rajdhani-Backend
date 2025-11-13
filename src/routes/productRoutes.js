import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductStats,
  getProductDropdownData,
  toggleIndividualStockTracking,
  syncProductStock
} from '../controllers/productController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for all product routes
router.use(checkPageAccess('products'));

// Product CRUD routes with action permissions
router.post('/', checkPermission('product_create'), createProduct);
router.get('/', checkPermission('product_view'), getProducts);
router.get('/stats', checkPermission('product_view'), getProductStats);
router.get('/dropdown-data', checkPermission('product_view'), getProductDropdownData);
router.get('/:id', checkPermission('product_view'), getProductById);
router.put('/:id', checkPermission('product_edit'), updateProduct);
router.patch('/:id/toggle-individual-tracking', checkPermission('product_edit'), toggleIndividualStockTracking);
router.patch('/:id/sync-stock', checkPermission('product_edit'), syncProductStock);
router.delete('/:id', checkPermission('product_delete'), deleteProduct);

export default router;
