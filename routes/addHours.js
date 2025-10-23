const express = require('express')
const router = express.Router()

const { addhours, readsessions, addsessions } = require('../controllers/addHours')

// Middleware to check if user is logged in
const authenticate = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
    next();
};

router.post('/addhours', addhours)
router.get('/sessions', authenticate, readsessions)
router.post('/sessions', authenticate, addsessions)

module.exports = router