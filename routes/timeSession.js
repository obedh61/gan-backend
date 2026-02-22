const express = require('express')
const router = express.Router()

const { timesession, startTime, endTime, startSession, worksession, fetchSessions, updateSession } = require('../controllers/timeSession')

router.get('/sessions/active/:idNumber', startSession)
router.get('/session', timesession)
router.post('/sessions/start', startTime)
router.post('/sessions/end', endTime)
router.get('/sessions/:idNumber/:year/:month', worksession)
router.get('/sessions/private/:idNumber/:year/:month', fetchSessions)
router.put('/sessions/:id', updateSession)

module.exports = router