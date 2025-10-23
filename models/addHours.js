const mongoose = require('mongoose');
const Worker = require('./worker')

const workSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
});
  
module.exports = mongoose.model('WorkSession', workSessionSchema);