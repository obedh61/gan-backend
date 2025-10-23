const express = require('express')
const router = express.Router()
// import controller
const { read, update } = require('../controllers/user')
const { requireSingin, adminMiddleware } = require('../controllers/auth')


router.get('/user/:id', requireSingin, read)
router.put('/user/update', requireSingin, update)
router.put('/admin/update', requireSingin, adminMiddleware, update)


module.exports = router