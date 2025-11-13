import express from 'express';
import {
  createProductRecipe,
  getRecipeByProductId,
  calculateProductionMaterials,
  updateRecipe,
  addMaterialToRecipe,
  removeMaterialFromRecipe,
  deleteRecipe,
  getAllRecipes
} from '../controllers/recipeController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Check page access for recipe routes (related to production)
router.use(checkPageAccess('production'));

// Recipe CRUD routes with action permissions
router.post('/', checkPermission('production_create'), createProductRecipe);
router.get('/', checkPermission('production_view'), getAllRecipes);
router.get('/product/:product_id', checkPermission('production_view'), getRecipeByProductId);
router.put('/:recipe_id', checkPermission('production_edit'), updateRecipe);
router.delete('/:recipe_id', checkPermission('production_delete'), deleteRecipe);

// Material management routes
router.post('/:recipe_id/materials', checkPermission('production_edit'), addMaterialToRecipe);
router.delete('/:recipe_id/materials/:material_id', checkPermission('production_edit'), removeMaterialFromRecipe);

// Calculation routes
router.post('/calculate', checkPermission('production_view'), calculateProductionMaterials);

export default router;
