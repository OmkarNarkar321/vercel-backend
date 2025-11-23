// backend/scripts/migrateImages.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');
require('dotenv').config();

const uploadsDir = path.join(__dirname, '../uploads/profile-images');

// Create directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

async function migrateImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const students = await Student.find({ 
      profileImage: { $exists: true, $ne: null } 
    });
    
    console.log(`\n📊 Found ${students.length} students with profile images`);
    console.log('=' .repeat(50));

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const student of students) {
      try {
        // Check if it's a Base64 image
        if (student.profileImage && student.profileImage.startsWith('data:image')) {
          console.log(`\n🔄 Processing student: ${student.fullName} (${student.email})`);
          
          // Extract Base64 data
          const matches = student.profileImage.match(/^data:image\/(\w+);base64,(.+)$/);
          
          if (!matches) {
            console.log(`   ⚠️  Invalid Base64 format`);
            errors++;
            continue;
          }

          const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          
          // Convert Base64 to buffer
          const buffer = Buffer.from(base64Data, 'base64');
          const sizeInMB = (buffer.length / (1024 * 1024)).toFixed(2);
          
          console.log(`   📏 Image size: ${sizeInMB}MB`);

          // Generate filename
          const filename = `${student._id}_${Date.now()}.${extension}`;
          const filepath = path.join(uploadsDir, filename);

          // Write file
          fs.writeFileSync(filepath, buffer);
          console.log(`   💾 Saved to: ${filename}`);

          // Update student record
          student.profileImage = `/uploads/profile-images/${filename}`;
          await student.save();

          migrated++;
          console.log(`   ✅ Migration successful`);
          
        } else if (student.profileImage.startsWith('/uploads/')) {
          console.log(`\n⏭️  Skipping ${student.fullName} - Already migrated`);
          skipped++;
        } else {
          console.log(`\n⚠️  Skipping ${student.fullName} - Unknown format: ${student.profileImage.substring(0, 30)}...`);
          skipped++;
        }
      } catch (error) {
        console.error(`\n❌ Error processing student ${student.fullName}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⏭️  Skipped (already migrated): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${students.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the migration
console.log('🚀 Starting image migration...\n');
migrateImages();