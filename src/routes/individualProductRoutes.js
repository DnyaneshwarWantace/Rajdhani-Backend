import express from 'express';
import {
  createIndividualProducts,
  createIndividualProduct,
  getIndividualProductsByProduct,
  getAllIndividualProducts,
  getIndividualProductById,
  getIndividualProductByQR,
  updateIndividualProduct,
  updateIndividualProductStatus,
  addDefect,
  fixDefect,
  getIndividualProductStats,
  deleteIndividualProduct
} from '../controllers/individualProductController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for individual product routes (related to products)
router.use(checkPageAccess('products'));

// Individual product routes with action permissions
router.post('/', checkPermission('individual_product_create'), createIndividualProduct);
router.post('/bulk', checkPermission('individual_product_create'), createIndividualProducts);
router.get('/', checkPermission('individual_product_view'), getAllIndividualProducts);
router.get('/product/:product_id', checkPermission('individual_product_view'), getIndividualProductsByProduct);
router.get('/stats', checkPermission('individual_product_view'), getIndividualProductStats); // Overall stats
router.get('/stats/:product_id', checkPermission('individual_product_view'), getIndividualProductStats); // Product-specific stats
router.get('/:id', checkPermission('individual_product_view'), getIndividualProductById);
router.get('/qr/:qr_code', checkPermission('individual_product_view'), getIndividualProductByQR); // QR access might need to be public, but for now require auth
router.put('/:id', checkPermission('individual_product_edit'), updateIndividualProduct);
router.patch('/:id/status', checkPermission('individual_product_edit'), updateIndividualProductStatus);
router.post('/:id/defects', checkPermission('individual_product_edit'), addDefect);
router.patch('/:id/defects/:defect_index/fix', checkPermission('individual_product_edit'), fixDefect);
router.delete('/:id', checkPermission('individual_product_delete'), deleteIndividualProduct);

export default router;
