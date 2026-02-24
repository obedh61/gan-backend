const express = require('express')
const router = express.Router()

// import controller
const {
    createSchoolYear,
    listSchoolYears,
    getActiveSchoolYears,
    getSchoolYear,
    toggleActiveStatus,
    deleteSchoolYear,
    uploadContract,
    getContractByParams
} = require('../controllers/schoolYearController')
const { requireSingin, adminMiddleware } = require('../controllers/auth')
const { uploadContractPDF, handlePdfUploadError } = require('../middleware/pdfUpload')

// User routes (auth only — parents need these for registration)
router.get('/schoolyear/active', requireSingin, getActiveSchoolYears)
router.get('/schoolyear/:id/contract', requireSingin, getContractByParams)

// Admin routes
router.post('/schoolyear/create', requireSingin, adminMiddleware, createSchoolYear)
router.get('/schoolyear/list', requireSingin, adminMiddleware, listSchoolYears)
router.get('/schoolyear/:id', requireSingin, adminMiddleware, getSchoolYear)
router.put('/schoolyear/:id/toggle-active', requireSingin, adminMiddleware, toggleActiveStatus)
router.delete('/schoolyear/:id', requireSingin, adminMiddleware, deleteSchoolYear)
router.post('/schoolyear/:id/upload-contract', requireSingin, adminMiddleware, uploadContractPDF, handlePdfUploadError, uploadContract)

module.exports = router
