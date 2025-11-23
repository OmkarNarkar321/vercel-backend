// backend/routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const { authenticateToken } = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/profile-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: studentId_timestamp_originalname
    const uniqueName = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload profile image route
router.post('/profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    console.log('📤 Profile image upload request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log('📁 File uploaded:', req.file.filename);

    // Get the student
    const student = await Student.findById(req.user.id);
    if (!student) {
      // Delete uploaded file if student not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    // Delete old profile image if exists
    if (student.profileImage && !student.profileImage.startsWith('data:image')) {
      const oldImagePath = path.join(__dirname, '..', student.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
        console.log('🗑️ Deleted old image');
      }
    }

    // Save new image path (relative path)
    student.profileImage = `/uploads/profile-images/${req.file.filename}`;
    await student.save();

    console.log('✅ Profile image updated successfully');

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      profileImage: student.profileImage,
      imageUrl: `http://localhost:${process.env.PORT || 5000}${student.profileImage}`
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error uploading image', 
      error: error.message 
    });
  }
});

// Get profile image
router.get('/profile-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(uploadsDir, filename);

  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ 
      success: false,
      message: 'Image not found' 
    });
  }
});

// Delete profile image
router.delete('/profile-image', authenticateToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    if (student.profileImage && !student.profileImage.startsWith('data:image')) {
      const imagePath = path.join(__dirname, '..', student.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ Profile image deleted');
      }
      student.profileImage = null;
      await student.save();
    }

    res.json({ 
      success: true,
      message: 'Profile image deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting image', 
      error: error.message 
    });
  }
});

module.exports = router;