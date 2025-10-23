const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    idNumber: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    locationStart: { type: Object },
    locationEnd: { type: Object },
    userAgent: { type: String },
});

module.exports = mongoose.model('TimeSession', sessionSchema);