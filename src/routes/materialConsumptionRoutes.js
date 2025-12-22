import express from 'express';
import {
  getAllMaterialConsumption,
  getMaterialConsumptionById,
  createMaterialConsumption,
  updateMaterialConsumption,
  deleteMaterialConsumption,
  getBatchConsumptionSummary,
  getConsumptionByMaterialType,
  getStepConsumption,
  getConsumptionAnalytics,
  getRawMaterialConsumptionHistory
} from '../controllers/materialConsumptionController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for material consumption routes (related to production)
router.use(checkPageAccess('production'));

// Material consumption routes with action permissions
router.get('/', checkPermission('production_view'), getAllMaterialConsumption);
router.get('/:id', checkPermission('production_view'), getMaterialConsumptionById);
router.post('/', checkPermission('production_create'), createMaterialConsumption);
router.put('/:id', checkPermission('production_edit'), updateMaterialConsumption);
router.delete('/:id', checkPermission('production_delete'), deleteMaterialConsumption);
router.get('/batch/:batchId/summary', checkPermission('production_view'), getBatchConsumptionSummary);
router.get('/batch/:batchId/type/:materialType', checkPermission('production_view'), getConsumptionByMaterialType);
router.get('/step/:stepId', checkPermission('production_view'), getStepConsumption);
router.get('/analytics/summary', checkPermission('production_view'), getConsumptionAnalytics);
router.get('/raw-material/:materialId/history', checkPermission('production_view'), getRawMaterialConsumptionHistory);

export default router;
