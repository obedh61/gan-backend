const express = require('express')
const router = express.Router()

const { requireSingin, adminMiddleware } = require('../controllers/auth')
const { addWorker, addChild, getChildren, deleteChild, getWorkers, deleteWorker, getWorkerByIdNumber } = require('../controllers/worker')

// All worker/child management routes are admin-only.
// Legacy child routes are kept commented out to match server.js disabling.
router.post('/addworker', requireSingin, adminMiddleware, addWorker)
// router.post('/addchild', requireSingin, adminMiddleware, addChild)
// router.get('/getchildren', requireSingin, adminMiddleware, getChildren)
// router.delete('/deletechild/:id', requireSingin, adminMiddleware, deleteChild)
router.get('/workers', requireSingin, adminMiddleware, getWorkers)
router.delete('/workers/:idNumber', requireSingin, adminMiddleware, deleteWorker)

// Public lookup used by the clock-in timer to greet the worker by name
router.get('/worker/:idNumber', getWorkerByIdNumber)

module.exports = router