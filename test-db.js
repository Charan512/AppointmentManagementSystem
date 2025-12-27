require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
    try {
        console.log('🔍 Testing MongoDB Connection...\n');
        console.log('MongoDB URI:', process.env.MONGODB_URI ? '✓ Found in .env' : '✗ Not found in .env');
        
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI is not defined in .env file');
            process.exit(1);
        }

        // Hide sensitive parts of the URI for display
        const uriDisplay = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//<username>:<password>@');
        console.log('Connecting to:', uriDisplay);
        console.log('\n⏳ Attempting connection...\n');

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ MongoDB Connection Successful!\n');
        console.log('📊 Connection Details:');
        console.log('   Host:', conn.connection.host);
        console.log('   Database:', conn.connection.name);
        console.log('   Port:', conn.connection.port);
        console.log('   Ready State:', conn.connection.readyState === 1 ? 'Connected' : 'Not Connected');
        
        // List collections
        const collections = await conn.connection.db.listCollections().toArray();
        console.log('\n📁 Collections in database:');
        if (collections.length === 0) {
            console.log('   (No collections yet - database is empty)');
        } else {
            collections.forEach(col => {
                console.log(`   - ${col.name}`);
            });
        }

        console.log('\n✨ Test completed successfully!');
        
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ MongoDB Connection Failed!\n');
        console.error('Error Details:');
        console.error('   Message:', error.message);
        if (error.code) {
            console.error('   Code:', error.code);
        }
        console.error('\n💡 Common issues:');
        console.error('   - Check if MONGODB_URI is correct in .env file');
        console.error('   - Verify network access (IP whitelist in MongoDB Atlas)');
        console.error('   - Ensure username and password are correct');
        console.error('   - Check if database user has proper permissions');
        process.exit(1);
    }
};

testConnection();
