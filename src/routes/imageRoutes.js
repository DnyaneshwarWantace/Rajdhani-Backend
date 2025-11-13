import express from 'express';
import { uploadImage, deleteImage, uploadSingle } from '../controllers/imageController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Upload image to R2
router.post('/upload', authenticate, uploadSingle, uploadImage);

// Delete image from R2
router.delete('/delete', authenticate, deleteImage);

export default router;

