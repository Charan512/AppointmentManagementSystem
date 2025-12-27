require('dotenv').config();
const mongoose = require('mongoose');

const checkDatabase = async () => {
    try {
        console.log('🔍 Checking MongoDB Database...\n');

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Collections in database:');

        if (collections.length === 0) {
            console.log('   (No collections yet)');
        } else {
            for (const col of collections) {
                const count = await mongoose.connection.db.collection(col.name).countDocuments();
                console.log(`   - ${col.name}: ${count} documents`);
            }
        }

        console.log('\n📊 Sample Data:\n');

        // Show users
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('👥 Users:');
        users.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
        });

        // Show organizations
        const orgs = await mongoose.connection.db.collection('organizations').find({}).toArray();
        console.log('\n🏢 Organizations:');
        orgs.forEach(org => {
            console.log(`   - ${org.organizationName} (${org.category})`);
            console.log(`     Address: ${org.address}`);
            console.log(`     Experts: ${org.experts.length}`);
        });

        // Show appointments
        const appointments = await mongoose.connection.db.collection('appointments').find({}).toArray();
        console.log('\n📅 Appointments:');
        if (appointments.length === 0) {
            console.log('   (No appointments yet)');
        } else {
            appointments.forEach(apt => {
                console.log(`   - ${apt.serviceName} with ${apt.expertName}`);
                console.log(`     Date: ${apt.appointmentDate}, Time: ${apt.appointmentTime}`);
                console.log(`     Status: ${apt.status}`);
            });
        }

        console.log('\n✨ Database check completed!');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
};

checkDatabase();
