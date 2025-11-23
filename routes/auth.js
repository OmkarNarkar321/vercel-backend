// backend/routes/auth.js - FIXED ROUTE ORDER
const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// IMPORTANT: SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES
// ============================================

// 🔐 POST - Check if email exists (SPECIFIC - must be before /students/:id)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const existingStudent = await Student.findOne({ email: email.toLowerCase() });
    
    res.json({
      success: true,
      exists: !!existingStudent
    });

  } catch (error) {
    console.error('❌ Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email',
      error: error.message
    });
  }
});

// 🔐 POST - Register new student (SPECIFIC)
router.post('/register', async (req, res) => {
  try {
    console.log('🔐 Registration request received:', req.body);

    const {
      email,
      password,
      fullName,
      address,
      gender,
      dateOfBirth,
      mobileNo,
      courseName,
      college,
      educationFrom,
      educationTo,
      skills,
      certificationTitle,
      certificationSpecs,
      certificationDesc,
      trainingTitle,
      trainingCompany,
      trainingFrom,
      trainingTo,
      trainingDesc
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create student object matching your model structure
    const studentData = {
      email,
      password,
      fullName,
      personalInfo: {
        address,
        gender,
        dateOfBirth,
        mobileNo
      },
      education: [{
        courseName,
        college,
        from: educationFrom,
        to: educationTo
      }],
      skills: Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim())
    };

    // Add optional fields if provided
    if (certificationTitle) {
      studentData.coursesAndCertifications = [{
        title: certificationTitle,
        specifications: certificationSpecs,
        description: certificationDesc
      }];
    }

    if (trainingTitle) {
      studentData.trainingAndInternships = [{
        title: trainingTitle,
        company: trainingCompany,
        from: trainingFrom,
        to: trainingTo,
        description: trainingDesc
      }];
    }

    // Create new student
    const student = new Student(studentData);
    await student.save();

    console.log('✅ Student created successfully:', student._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: student._id,
        email: student.email 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      student: {
        id: student._id,
        email: student.email,
        fullName: student.fullName,
        userType: student.userType
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// 🔐 POST - Login student (SPECIFIC)
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request received');
    const { email, password } = req.body;

    console.log('📧 Login attempt for email:', email);
    console.log('📝 Password length:', password ? password.length : 0);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find student
    const student = await Student.findOne({ email });
    
    if (!student) {
      console.log('❌ No student found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Student found:', student.email);
    console.log('📝 Stored password hash (first 20 chars):', student.password.substring(0, 20));

    // Check password using the comparePassword method
    const isMatch = await student.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Password matched successfully');

    // Update last login timestamp
    student.lastLoginAt = new Date();
    await student.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: student._id,
        email: student.email 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful:', student.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      student: {
        id: student._id,
        email: student.email,
        fullName: student.fullName,
        userType: student.userType
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// 🔐 POST - Change password (SPECIFIC - Protected route)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 Change password request received');
    console.log('👤 User from token:', req.user);
    
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both new password and confirmation'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find student
    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('📝 Old password hash (first 20 chars):', student.password.substring(0, 20));

    // Set password and let pre-save hook handle hashing
    student.password = newPassword;
    student.passwordChangedAt = new Date();
    
    await student.save();

    // Verify the password was saved correctly
    const updatedStudent = await Student.findById(userId);
    console.log('📝 New password hash (first 20 chars):', updatedStudent.password.substring(0, 20));
    
    // Test if the new password works
    const testMatch = await bcrypt.compare(newPassword, updatedStudent.password);
    console.log('🧪 Password verification test:', testMatch ? '✅ PASS' : '❌ FAIL');

    if (!testMatch) {
      console.error('❌ WARNING: Password was not saved correctly!');
      return res.status(500).json({
        success: false,
        message: 'Password update failed. Please try again.'
      });
    }

    console.log(`✅ Password changed successfully for: ${student.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

// 🚪 POST - Logout (SPECIFIC - Protected route)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await Student.findByIdAndUpdate(userId, { 
      lastLogoutAt: new Date() 
    });
    
    console.log(`✅ User logged out: ${userId} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// 👤 GET - Get current user info (SPECIFIC - Protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Get user info - Token user:', req.user);
    
    const userId = req.user.userId;
    const student = await Student.findById(userId).select('-password');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      error: error.message
    });
  }
});

// 📋 GET - Get all students (SPECIFIC - for debugging/testing)
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find().select('-password');
    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
});

// ============================================
// PARAMETERIZED ROUTES - MUST COME AFTER ALL SPECIFIC ROUTES
// ============================================

// 📋 GET - Get single student by ID (PARAMETERIZED - comes AFTER /students)
router.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message
    });
  }
});

// 🔄 PUT - Update student data (PARAMETERIZED)
router.put('/students/:id', async (req, res) => {
  try {
    console.log('🔄 Update request received for student:', req.params.id);
    console.log('📦 Update data:', req.body);

    const studentId = req.params.id;
    const updateData = req.body;

    // Find student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update fields
    if (updateData.fullName) student.fullName = updateData.fullName;
    if (updateData.email) student.email = updateData.email;
    if (updateData.profileImage !== undefined) student.profileImage = updateData.profileImage;
    
    // Update personal info
    if (updateData.personalInfo) {
      student.personalInfo = {
        ...student.personalInfo,
        ...updateData.personalInfo
      };
    }

    // Update education (array)
    if (updateData.education) {
      student.education = updateData.education;
    }

    // Update skills (array)
    if (updateData.skills) {
      student.skills = updateData.skills;
    }

    // Update courses and certifications (array)
    if (updateData.coursesAndCertifications) {
      student.coursesAndCertifications = updateData.coursesAndCertifications;
    }

    // Update training and internships (array)
    if (updateData.trainingAndInternships) {
      student.trainingAndInternships = updateData.trainingAndInternships;
    }

    // Save updated student
    await student.save();

    console.log('✅ Student updated successfully');

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });

  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
});

// 🗑️ DELETE - Delete student (PARAMETERIZED - for testing)
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
});

module.exports = router;