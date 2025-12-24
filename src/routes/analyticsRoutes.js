import express from 'express';
import {
  getProductDemandByMonth,
  getMostProducedProducts,
  getMonthlySalesAnalytics,
  getMonthlyProductionAnalytics
} from '../controllers/analyticsController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

// Check page access for analytics (using products page access)
router.use(checkPageAccess('products'));

// Product demand analytics by month
router.get('/product-demand-monthly', checkPermission('product_view'), getProductDemandByMonth);

// Most produced products
router.get('/most-produced', checkPermission('product_view'), getMostProducedProducts);

// Monthly sales analytics
router.get('/sales-monthly', checkPermission('product_view'), getMonthlySalesAnalytics);

// Monthly production analytics
router.get('/production-monthly', checkPermission('product_view'), getMonthlyProductionAnalytics);

export default router;
