import express from 'express';
import {
  // Production routes
  createProduction,
  getProductions,
  getProductionById,
  updateProduction,
  deleteProduction,
  
  // Production Batch routes
  createProductionBatch,
  getProductionBatches,
  getProductionBatchById,
  updateProductionBatch,
  
  // Production Flow routes
  createProductionFlow,
  getProductionFlowById,
  getProductionFlowByBatchId,
  updateProductionFlow,
  createProductionFlowStep,
  getProductionFlowSteps,
  updateProductionFlowStep,
  
  // Production Machine routes
  createProductionMachine,
  getProductionMachines,
  getProductionMachineById,
  updateProductionMachine,
  
  // Production Waste routes
  createProductionWaste,
  getProductionWaste,
  getProductionWasteById,
  updateProductionWaste,
  returnWasteToInventory,
  
  // Statistics
  getProductionStats,
  
  // Planning Draft State routes
  savePlanningDraftState,
  getPlanningDraftState,
  deletePlanningDraftState
} from '../controllers/productionController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for all production routes
router.use(checkPageAccess('production'));

// Production routes with action permissions
router.post('/productions', checkPermission('production_create'), createProduction);
router.get('/productions', checkPermission('production_view'), getProductions);
router.get('/productions/:id', checkPermission('production_view'), getProductionById);
router.put('/productions/:id', checkPermission('production_edit'), updateProduction);
router.delete('/productions/:id', checkPermission('production_delete'), deleteProduction);

// Production Batch routes
router.post('/batches', checkPermission('production_create'), createProductionBatch);
router.get('/batches', checkPermission('production_view'), getProductionBatches);
router.get('/batches/:id', checkPermission('production_view'), getProductionBatchById);
router.put('/batches/:id', checkPermission('production_edit'), updateProductionBatch);

// Production Flow routes
router.post('/flows', checkPermission('production_create'), createProductionFlow);
// Flow steps routes - more specific routes must come before generic :id routes
router.get('/flows/:id/steps', checkPermission('production_view'), async (req, res) => {
  // Map path parameter to query parameter for getProductionFlowSteps
  req.query.flow_id = req.params.id;
  await getProductionFlowSteps(req, res);
});
router.get('/flows/batch/:batchId', checkPermission('production_view'), getProductionFlowByBatchId);
router.get('/flows/:id', checkPermission('production_view'), getProductionFlowById);
router.put('/flows/:id', checkPermission('production_edit'), updateProductionFlow);
// Flow steps routes - support query parameter
router.post('/flow-steps', checkPermission('production_create'), createProductionFlowStep);
router.get('/flow-steps', checkPermission('production_view'), getProductionFlowSteps);
router.put('/flow-steps/:id', checkPermission('production_edit'), updateProductionFlowStep);

// Production Machine routes
router.post('/machines', checkPermission('machine_create'), createProductionMachine);
router.get('/machines', checkPermission('machine_view'), getProductionMachines);
router.get('/machines/:id', checkPermission('machine_view'), getProductionMachineById);
router.put('/machines/:id', checkPermission('machine_edit'), updateProductionMachine);
// Note: Machine delete endpoint not implemented yet, but permission is ready

  // Production Waste routes
  router.post('/waste', checkPermission('production_create'), createProductionWaste);
  router.get('/waste', checkPermission('production_view'), getProductionWaste);
  router.get('/waste/:id', checkPermission('production_view'), getProductionWasteById);
  router.put('/waste/:id', checkPermission('production_edit'), updateProductionWaste);
  router.post('/waste/:id/return-to-inventory', checkPermission('production_edit'), returnWasteToInventory);

// Statistics
router.get('/stats', checkPermission('production_view'), getProductionStats);

// Planning Draft State routes
router.post('/planning-draft', checkPermission('production_create'), savePlanningDraftState);
router.get('/planning-draft/:product_id', checkPermission('production_view'), getPlanningDraftState);
router.delete('/planning-draft/:product_id', checkPermission('production_edit'), deletePlanningDraftState);

export default router;
