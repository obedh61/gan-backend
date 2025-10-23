const createPDF = require('./pdfGenerator');
const sendEmail = require('./emailService');
const calculatePrice = require('./priceCalculator');
const path = require('path');
const moment = require('moment-timezone');

exports.register = async (req, res) => {
    try {
        const { age, branch, firstname, lastname, signature, contact, childsname, bank, numBank, teudatZeut } = req.body;

        const babyPrice = calculatePrice(branch, age);
        const startDate = new Date()
        const pdfData = { firstname, lastname, signature, childsname, bank, numBank, teudatZeut, contact, startDate, babyPrice };

        const pdfPath = path.join(__dirname, 'output', 'contract.pdf');
        await createPDF(pdfData, pdfPath);

        const recipients = ['obedh61@gmail.com', 'obedhc91@gmail.com', 'gansecondhome@gmail.com'];
        const subject = 'Contract Registration';
        const body = 'Welcome to Gan Montessori Second Home. Please find your contract attached.';
        await sendEmail(recipients, subject, body, pdfPath);

        res.json({ message: 'Registration successful. Email sent with the contract.' });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error processing registration', error: error.message });
    }
};
