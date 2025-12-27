// URL encode password for MongoDB connection string
const password = 'cHaran@55';
const encodedPassword = encodeURIComponent(password);

console.log('Original password:', password);
console.log('Encoded password:', encodedPassword);
console.log('\nUse this in your MONGODB_URI:');
console.log(`mongodb+srv://<username>:${encodedPassword}@cluster1.ymf1gqe.mongodb.net/appointment_queue_db?retryWrites=true&w=majority&appName=Cluster1`);
