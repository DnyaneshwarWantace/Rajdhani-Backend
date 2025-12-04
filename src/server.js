import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database.js';
import rawMaterialRoutes from './routes/rawMaterialRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import dropdownRoutes from './routes/dropdownRoutes.js';
import productRoutes from './routes/productRoutes.js';
import individualProductRoutes from './routes/individualProductRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import materialConsumptionRoutes from './routes/materialConsumptionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import { activityLogMiddleware } from './middleware/activityLogMiddleware.js';
import { setSocketIO } from './utils/detailedLogger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// CORS configuration from environment variables
// FRONTEND_URLS should be comma-separated list: "https://rajdhani.wantace.com,http://localhost:3000"
const FRONTEND_URLS = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',').map(url => url.trim())
  : ['https://rajdhani.wantace.com', 'http://localhost:3000'];

console.log('🌐 CORS Allowed Origins:', FRONTEND_URLS);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URLS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware - CORS for both old and new frontend
app.use(cors({
  origin: FRONTEND_URLS,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
connectDB();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join admin room when admin connects
  socket.on('join-admin-logs', (userData) => {
    if (userData && userData.role === 'admin') {
      socket.join('admin-logs');
      console.log('👨‍💼 Admin joined logs room:', userData.email);
      socket.emit('joined-logs-room', { success: true });
    } else {
      socket.emit('joined-logs-room', { success: false, error: 'Admin access required' });
    }
  });

  // Leave admin room
  socket.on('leave-admin-logs', () => {
    socket.leave('admin-logs');
    console.log('👋 Client left admin logs room');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Inject Socket.IO instance into detailed logger
setSocketIO(io);

// Activity logging middleware (must be after Socket.IO setup and before routes)
app.use(activityLogMiddleware(io));

// Routes
// Auth routes (public) // nwe thins  added 
app.use('/api/auth', authRoutes);

// Public routes for QR code scanning (no authentication required)
app.use('/api/public', publicRoutes);

// Protected routes
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/dropdowns', dropdownRoutes);
app.use('/api/products', productRoutes);
app.use('/api/individual-products', individualProductRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/material-consumption', materialConsumptionRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Cleanup routes
import cleanupRoutes from './routes/cleanupRoutes.js';
app.use('/api/cleanup', cleanupRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Rajdhani Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - log the missing route for debugging
app.use((req, res) => {
  console.log(`404 Error: User attempted to access non-existent route:"${req.path}"`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server with Socket.IO
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO enabled for real-time activity logs`);
});

export default app;
export { io };
