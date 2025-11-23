// backend/models/ContactMessage.js
const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false // Optional - for tracking if user is logged in
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  response: {
    type: String,
    trim: true
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: String
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for faster queries
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ userId: 1 });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

module.exports = ContactMessage;