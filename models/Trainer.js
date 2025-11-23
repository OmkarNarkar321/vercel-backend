// backend/models/Trainer.js
const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  // Personal Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  currentDesignation: {
    type: String,
    required: [true, 'Current designation is required'],
    trim: true
  },
  organization: {
    type: String,
    required: [true, 'Organization is required'],
    trim: true
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    enum: [
      'High School Diploma',
      'Diploma',
      'B.Sc (Bachelor of Science)',
      'B.A (Bachelor of Arts)',
      'B.Com (Bachelor of Commerce)',
      'BBA (Bachelor of Business Administration)',
      'B.Tech/B.E (Bachelor of Technology/Engineering)',
      'M.Sc (Master of Science)',
      'M.A (Master of Arts)',
      'M.Com (Master of Commerce)',
      'MBA (Master of Business Administration)',
      'M.Tech/M.E (Master of Technology/Engineering)',
      'PhD (Doctor of Philosophy)',
      'Post-Doctoral',
      'Professional Certification',
      'Other'
    ]
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  linkedin: {
    type: String,
    trim: true
  },

  // Counseling Services
  careerCounseling: [{
    type: String,
    enum: ['10th Standard', '12th Standard', 'Engineering', 'ITI (Industrial Training)', 'Medical']
  }],
  
  domainCounseling: {
    computer: [{
      type: String,
      enum: ['Data Mining', 'Cyber Security', 'Cloud Computing', 'Software Engineering', 'Data Science']
    }],
    mechanical: [{
      type: String,
      enum: ['Thermodynamics', 'Fluid Mechanics', 'Robotics', 'CAD/CAM', 'Manufacturing']
    }],
    automobile: [{
      type: String,
      enum: ['Vehicle Dynamics', 'Engine Design', 'EV Technology', 'Fuel System', 'Automotive Electronics']
    }],
    electrical: [{
      type: String,
      enum: ['Power System', 'Circuit Analysis', 'Control System', 'Renewable Energy', 'Microcontroller']
    }],
    civil: [{
      type: String,
      enum: ['Structural Engineering', 'Geotechnical', 'Transportation', 'Environmental Engineering', 'Surveying']
    }]
  },

  interviewCounseling: [{
    type: String,
    enum: ['Aptitude Test Preparation', 'Mock Interview Sessions', 'Resume Building', 'Group Discussion Training']
  }],

  // Availability & Preferences
  availability: [{
    type: String,
    enum: ['Weekdays Morning', 'Weekdays Evening', 'Weekends', 'Flexible']
  }],
  preferredMode: {
    type: String,
    required: [true, 'Preferred mode is required'],
    enum: ['Online', 'Offline', 'Both']
  },
  expectedRemuneration: {
    type: String,
    required: [true, 'Expected remuneration is required'],
    trim: true
  },

  // Documents
  resume: {
    type: String, // Store file path or URL
    required: [true, 'Resume is required']
  },
  certificates: {
    type: String // Store file path or URL
  },

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'on_hold'],
    default: 'pending'
  },
  
  statusNotes: {
    type: String,
    trim: true
  },

  reviewedBy: {
    type: String,
    trim: true
  },

  reviewedAt: {
    type: Date
  },

  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
trainerSchema.index({ email: 1 });
trainerSchema.index({ status: 1 });
trainerSchema.index({ submittedAt: -1 });

// Update lastUpdated before saving
trainerSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Trainer', trainerSchema);