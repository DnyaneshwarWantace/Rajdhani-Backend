import express from 'express';
import {
  getAllDropdownOptions,
  getOptionsByCategory,
  getMultipleCategories,
  getProductDropdownData,
  getMaterialDropdownData,
  getProductionDropdownData,
  createDropdownOption,
  updateDropdownOption,
  toggleActiveStatus,
  deleteDropdownOption,
  getAllCategories,
  getUnitsByTypeEndpoint,
  getAllUnitsEndpoint
} from '../controllers/dropdownController.js';
import { authenticate, checkPermission, checkPageAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Read operations (GET) - allow all authenticated users (used across pages)
// Write operations (POST, PUT, DELETE) - require settings permission

// Get all dropdown options (with optional filtering) - accessible to all authenticated users
router.get('/', getAllDropdownOptions);

// Get all unique categories - accessible to all authenticated users
router.get('/categories', getAllCategories);

// Get all predefined units - accessible to all authenticated users
router.get('/units', getAllUnitsEndpoint);

// Get units by type - accessible to all authenticated users
router.get('/units/:type', getUnitsByTypeEndpoint);

// Get multiple categories at once - accessible to all authenticated users
router.get('/multiple', getMultipleCategories);

// Get all product-related dropdowns - requires products page access
router.get('/products', checkPageAccess('products'), getProductDropdownData);

// Get all material-related dropdowns - requires materials page access
router.get('/materials', checkPageAccess('materials'), getMaterialDropdownData);

// Get all production-related dropdowns - requires production page access
router.get('/production', checkPageAccess('production'), getProductionDropdownData);

// Get options by specific category - accessible to all authenticated users
router.get('/category/:category', getOptionsByCategory);

// Write operations require settings permission
router.post('/', checkPageAccess('settings'), createDropdownOption);
router.put('/:id', checkPageAccess('settings'), updateDropdownOption);
router.patch('/:id/toggle', checkPageAccess('settings'), toggleActiveStatus);
router.delete('/:id', checkPageAccess('settings'), deleteDropdownOption);

export default router;
