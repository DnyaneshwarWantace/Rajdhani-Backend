import express from 'express';
import {
  getProductById,
} from '../controllers/productController.js';
import {
  getIndividualProductById,
  getIndividualProductsByProduct
} from '../controllers/individualProductController.js';

const router = express.Router();

// Public routes for QR code scanning - NO AUTHENTICATION REQUIRED
// These endpoints allow anyone with a QR code to view product details

// Get product by ID (for main product QR codes)
router.get('/products/:id', getProductById);

// Get individual product by ID (for individual product QR codes)
router.get('/individual-products/:id', getIndividualProductById);

// Get individual products by product ID (for batch filtering)
router.get('/individual-products/product/:product_id', getIndividualProductsByProduct);

export default router;
