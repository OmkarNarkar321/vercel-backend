const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Your MongoDB connection string (check your .env file)
const MONGODB_URI = 'mongodb://localhost:27017/authdb';

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Hash the new password
    const newPassword = 'omkarnarkar@2004!!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    
    const result = await Student.updateOne(
      { email: 'narkaromkar65@gmail.com' },
      { 
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successfully!');
      console.log('📧 Email: narkaromkar65@mail.com');
      console.log('🔑 New Password: omkarnarkar@2004!!');
    } else {
      console.log('❌ User not found');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();