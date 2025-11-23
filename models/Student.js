// backend/models/Student.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  // Basic Authentication Info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  userType: {
    type: String,
    default: 'student',
    immutable: true
  },

  // Profile Image
  profileImage: {
    type: String,
    default: null
  },

  // Personal Information
  personalInfo: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'other']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    mobileNo: {
      type: String,
      required: [true, 'Mobile number is required']
    }
  },

  // Education - Array for multiple entries
  education: [{
    courseName: {
      type: String,
      required: true
    },
    college: {
      type: String,
      required: true
    },
    from: {
      type: String
    },
    to: {
      type: String
    }
  }],

  // Skills Array
  skills: [{
    type: String,
    required: true
  }],

  // Courses and Certifications
  coursesAndCertifications: [{
    title: String,
    specifications: String,
    description: String
  }],

  // Training and Internships
  trainingAndInternships: [{
    title: String,
    company: String,
    from: String,
    to: String,
    description: String
  }],

  // Password Management & Security Fields
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },
  lastLogoutAt: {
    type: Date
  }
  
}, {
  timestamps: true
});

// ============================================
// 🔐 PRE-SAVE HOOK: Hash password before saving
// ============================================
studentSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    console.log('⏭️ Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('🔐 Hashing password for:', this.email);
    console.log('📝 Plain password length:', this.password.length);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    console.log('📝 Hashed password (first 20 chars):', hashedPassword.substring(0, 20));
    
    this.password = hashedPassword;
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// ============================================
// 🔍 INSTANCE METHODS
// ============================================

// Method to compare password for login
studentSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparing passwords for:', this.email);
    console.log('📝 Candidate password length:', candidatePassword.length);
    console.log('📝 Stored hash (first 20 chars):', this.password.substring(0, 20));
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔍 Password match result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// Remove password from JSON output (security)
studentSchema.methods.toJSON = function() {
  const student = this.toObject();
  delete student.password;
  delete student.passwordResetToken;
  return student;
};

// ============================================
// 📊 STATIC METHODS
// ============================================

// Find student by email (case-insensitive)
studentSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Check if password was changed after token was issued
studentSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;