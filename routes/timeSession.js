const express = require('express')
const router = express.Router()

const { requireSingin, adminMiddleware } = require('../controllers/auth')
const { timesession, startTime, endTime, startSession, worksession, fetchSessions, updateSession, exportSessions, exportSessionsPDF } = require('../controllers/timeSession')

// Public worker timer endpoints (used by clock-in UI without JWT)
router.get('/sessions/active/:idNumber', startSession)
router.post('/sessions/start', startTime)
router.post('/sessions/end', endTime)
router.get('/sessions/:idNumber/:year/:month', worksession)

// Public worker endpoints (used by clock-in UI without JWT)
router.get('/sessions/export/:idNumber/:year/:month', exportSessions)
router.get('/sessions/export/:idNumber/:year/:month/pdf', exportSessionsPDF)

// Admin-only session management
router.get('/session', requireSingin, adminMiddleware, timesession)
router.get('/sessions/private/:idNumber/:year/:month', requireSingin, adminMiddleware, fetchSessions)
router.put('/sessions/:id', requireSingin, adminMiddleware, updateSession)

module.exports = router