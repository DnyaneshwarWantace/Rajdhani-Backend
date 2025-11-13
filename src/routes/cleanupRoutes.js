import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Only admin can access cleanup routes (DANGEROUS OPERATIONS!)
router.use(authorize('admin'));

// Clear all production-related data
router.post('/clear-production', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    const results = {
      batches: await db.collection('production_batches').deleteMany({}),
      flows: await db.collection('production_flows').deleteMany({}),
      flowSteps: await db.collection('production_flow_steps').deleteMany({}),
      steps: await db.collection('production_steps').deleteMany({}),
      consumption: await db.collection('material_consumption').deleteMany({}),
      waste: await db.collection('production_waste').deleteMany({})
    };

    res.json({
      success: true,
      message: 'All production data cleared',
      deleted: {
        batches: results.batches.deletedCount,
        flows: results.flows.deletedCount,
        flowSteps: results.flowSteps.deletedCount,
        steps: results.steps.deletedCount,
        consumption: results.consumption.deletedCount,
        waste: results.waste.deletedCount
      }
    });
  } catch (error) {
    console.error('Error clearing production data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

