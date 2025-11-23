// backend/check-database.js
const mongoose = require('mongoose');
const path = require('path');

// Load .env from backend folder
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔌 Attempting to connect...');
console.log('📍 Database:', MONGODB_URI ? MONGODB_URI.split('/').pop().split('?')[0] : 'NOT FOUND');

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file!');
  console.log('💡 Make sure .env is in backend folder with:');
  console.log('   MONGODB_URI=mongodb://localhost:27017/authdb');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    console.log('📊 Database Name:', db.databaseName);
    console.log('='.repeat(60));
    
    // List ALL collections
    const collections = await db.listCollections().toArray();
    console.log('\n📂 ALL COLLECTIONS IN DATABASE:');
    console.log('─'.repeat(60));
    
    if (collections.length === 0) {
      console.log('   ⚠️  No collections found! Database is empty.');
    }
    
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`\n   📁 Collection: "${coll.name}"`);
      console.log(`   📊 Documents: ${count}`);
      
      // Show sample if has data
      if (count > 0) {
        const sample = await db.collection(coll.name).findOne();
        console.log(`   🔑 Keys: ${Object.keys(sample).join(', ')}`);
        
        // Check if this looks like student data
        if (sample.fullName || sample.email || sample.education) {
          console.log('\n   ✨ This looks like STUDENT DATA! ✨');
          
          // Check data structure
          if (sample.education) {
            const isArray = Array.isArray(sample.education);
            console.log(`   📚 education: ${isArray ? '✅ Array (good!)' : '⚠️  Object (needs migration)'}`);
          }
          if (sample.coursesAndCertifications) {
            const isArray = Array.isArray(sample.coursesAndCertifications);
            console.log(`   🎓 coursesAndCertifications: ${isArray ? '✅ Array (good!)' : '⚠️  Object (needs migration)'}`);
          }
          if (sample.trainingAndInternships) {
            const isArray = Array.isArray(sample.trainingAndInternships);
            console.log(`   💼 trainingAndInternships: ${isArray ? '✅ Array (good!)' : '⚠️  Object (needs migration)'}`);
          }
          if (sample.profileImage !== undefined) {
            console.log(`   🖼️  profileImage: ✅ Exists`);
          } else {
            console.log(`   🖼️  profileImage: ⚠️  Missing (will be added)`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 NEXT STEPS:');
    console.log('─'.repeat(60));
    
    const hasStudents = collections.some(c => 
      c.name.toLowerCase().includes('student') || 
      c.name.toLowerCase().includes('user')
    );
    
    if (hasStudents) {
      console.log('   1. ✅ Student data found!');
      console.log('   2. If you see ⚠️  "Object (needs migration)", run:');
      console.log('      node backend/migrate.js');
      console.log('   3. If all show ✅ "Array", you\'re good to go!');
    } else {
      console.log('   ⚠️  No student collections found.');
      console.log('   💡 Check if you\'re connected to the right database.');
      console.log('   💡 Or create some test students first.');
    }
    
    console.log('='.repeat(60) + '\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  })
  .catch(err => {
    console.error('❌ Connection Error:', err.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Is MongoDB running? Check with: net start | findstr -i mongo');
    console.log('   2. Is the database name correct? Currently using: authdb');
    console.log('   3. Try connecting with MongoDB Compass to verify.');
    process.exit(1);
  });