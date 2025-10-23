const express = require('express')
const router = express.Router()

const { addWorker, addChild, getChildren, deleteChild, getWorkers, deleteWorker } = require('../controllers/worker')

router.post('/addworker', addWorker)
router.post('/addchild', addChild)
router.get('/getchildren', getChildren)
router.delete('/deletechild/:id', deleteChild)
router.get('/workers', getWorkers)
router.delete("/workers/:idNumber", deleteWorker)

module.exports = router