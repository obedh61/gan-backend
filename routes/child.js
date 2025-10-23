const express = require('express')
const router = express.Router()
// import controller
const { register } = require('../controllers/registerController')
const { requireSingin, adminMiddleware } = require('../controllers/auth')


router.post('/register', register)



module.exports = router