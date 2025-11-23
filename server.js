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
const trainerRoutes = require('./routes/trainer'); // ✅ NEW

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory for trainers if it doesn't exist
const trainerUploadsDir = path.join(__dirname, 'uploads', 'trainers');
if (!fs.existsSync(trainerUploadsDir)) {
  fs.mkdirSync(trainerUploadsDir, { recursive: true });
  console.log('✅ Created trainers upload directory');
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/trainer', trainerRoutes); // ✅ NEW

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Xplore API is running!',
    status: 'online',
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
      viewContactMessages: `http://localhost:${process.env.PORT || 5000}/api/contact/view-messages`,
      viewCounselingRequests: `http://localhost:${process.env.PORT || 5000}/api/counseling/view-requests`,
      viewTrainerApplications: `http://localhost:${process.env.PORT || 5000}/api/trainer/view-trainers`
    }
  });
});

// Add this route BEFORE the error handling middleware
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-test.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
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