const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    idNumber: { type: String, required: true, unique: true, match: /^\d{9}$/ },
});

module.exports = mongoose.model('Worker', workerSchema);