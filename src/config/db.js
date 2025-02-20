const { MongoClient } = require('mongodb');

const mongoUri = 'mongodb://127.0.0.1:27017/gitky'; // Replace with your URI
const client = new MongoClient(mongoUri);

async function connectToMongoDB() {
    try {
        await client.connect();
        return client.db('gitky');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

module.exports = { connectToMongoDB, client };