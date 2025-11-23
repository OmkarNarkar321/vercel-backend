// backend/models/Counseling.js
const mongoose = require('mongoose');

const counselingSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  counselingPoints: {
    type: String,
    required: [true, 'Counseling points are required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'completed'],
    default: 'pending'
  },
  // Optional: Link to student if they're logged in
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Counseling', counselingSchema);