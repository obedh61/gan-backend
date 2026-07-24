const express = require('express')
const router = express.Router()
// import controller
const { read, update, listUsers, removeUser, updateUserRole, updateUserBlocked } = require('../controllers/user')
const { requireSingin, adminMiddleware } = require('../controllers/auth')


router.get('/user/:id', requireSingin, read)
router.put('/user/update', requireSingin, update)
router.put('/admin/update', requireSingin, adminMiddleware, update)

// admin user management
router.get('/admin/users', requireSingin, adminMiddleware, listUsers)
router.delete('/admin/users/:userId', requireSingin, adminMiddleware, removeUser)
router.put('/admin/users/:userId/role', requireSingin, adminMiddleware, updateUserRole)
router.put('/admin/users/:userId/blocked', requireSingin, adminMiddleware, updateUserBlocked)


module.exports = router