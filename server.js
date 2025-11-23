// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const uploadRoutes = require('./routes/upload');
const counselingRoutes = require('./routes/counseling');
const trainerRoutes = require('./routes/trainer');

const app = express();

// ✅ UPDATED: CORS configuration for Vercel deployment
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL, // Add your frontend Vercel URL in env variables
  'https://your-frontend-app.vercel.app' // Replace with your actual frontend URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ UPDATED: Create uploads directory (only for local development)
// Note: Vercel uses ephemeral filesystem, so uploads won't persist
// Consider using cloud storage (AWS S3, Cloudinary) for production
if (process.env.NODE_ENV !== 'production') {
  const trainerUploadsDir = path.join(__dirname, 'uploads', 'trainers');
  if (!fs.existsSync(trainerUploadsDir)) {
    fs.mkdirSync(trainerUploadsDir, { recursive: true });
    console.log('✅ Created trainers upload directory');
  }
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Database connection with better error handling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // Don't exit process in serverless environment
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/trainer', trainerRoutes);

// ✅ UPDATED: Root route with dynamic URL
app.get('/', (req, res) => {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : `http://localhost:${process.env.PORT || 5000}`;
    
  res.json({ 
    message: 'Xplore API is running!',
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        changePassword: '/api/auth/change-password',
        logout: '/api/auth/logout',
        me: '/api/auth/me',
        students: '/api/auth/students'
      },
      contact: {
        submit: '/api/contact',
        viewMessages: '/api/contact/view-messages',
        messagesAPI: '/api/contact/messages'
      },
      upload: {
        profileImage: '/api/upload/profile-image'
      },
      counseling: {
        submit: '/api/counseling/submit',
        viewRequests: '/api/counseling/view-requests',
        requestsAPI: '/api/counseling/requests',
        singleRequest: '/api/counseling/requests/:id'
      },
      trainer: {
        submit: '/api/trainer/submit',
        viewTrainers: '/api/trainer/view-trainers',
        trainersAPI: '/api/trainer/trainers',
        singleTrainer: '/api/trainer/trainers/:id',
        updateStatus: '/api/trainer/trainers/:id/status',
        stats: '/api/trainer/stats/overview'
      }
    },
    quickLinks: {
      viewContactMessages: `${baseUrl}/api/contact/view-messages`,
      viewCounselingRequests: `${baseUrl}/api/counseling/view-requests`,
      viewTrainerApplications: `${baseUrl}/api/trainer/view-trainers`
    }
  });
});

// Test route
app.get('/test', (req, res) => {
  const testHtmlPath = path.join(__dirname, 'api-test.html');
  if (fs.existsSync(testHtmlPath)) {
    res.sendFile(testHtmlPath);
  } else {
    res.json({ message: 'Test route working!', timestamp: new Date().toISOString() });
  }
});

// Admin route
app.get('/admin', (req, res) => {
  const adminHtmlPath = path.join(__dirname, 'admin-dashboard.html');
  if (fs.existsSync(adminHtmlPath)) {
    res.sendFile(adminHtmlPath);
  } else {
    res.json({ message: 'Admin dashboard coming soon!', timestamp: new Date().toISOString() });
  }
});

// Health check route for monitoring
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// ✅ UPDATED: Conditional server start (only for local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads accessible at: http://localhost:${PORT}/uploads`);
    console.log(`📧 View contact messages at: http://localhost:${PORT}/api/contact/view-messages`);
    console.log(`🎓 View counseling requests at: http://localhost:${PORT}/api/counseling/view-requests`);
    console.log(`👨‍🏫 View trainer applications at: http://localhost:${PORT}/api/trainer/view-trainers`);
    console.log(`🏠 API Home: http://localhost:${PORT}/`);
    console.log('');
    console.log('✅ All routes registered successfully!');
  });
}

// ✅ Export for Vercel serverless
module.exports = app;