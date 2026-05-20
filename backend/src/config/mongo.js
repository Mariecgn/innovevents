const mongoose = require('mongoose');

async function connectMongo() {
    await mongoose.connect(
        process.env.MONGO_URI ||
            'mongodb://localhost:27017/innovevents_logs'
    );
}

module.exports = {
    connectMongo
};