const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    signature: {
        type: String,
        trim: true,
        required: true,
        max: 32
    },
    firstname: '',
    lastname: '',
    contact: '',
    childsname: '',
    bank: '',
    numBank: '',
    termsAndConditions: false,
});
  