const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  childName: { type: String, required: true },
  teudatZeut: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  bank: { type: String, required: true },
  bankAccount: { type: String, required: true }
});

const Child = mongoose.model('Child', childSchema);

module.exports = Child;
