const express = require('express')
const router = express.Router()

// import controller
const {
    createRegistration,
    uploadSignedContract,
    getMyRegistrations,
    getRegistration,
    getPendingRegistrations,
    getRegistrationsBySchoolYear,
    approveRegistration,
    rejectRegistration,
    deleteRegistration,
    getSchoolYearStats
} = require('../controllers/childRegistrationController')
const { requireSingin, adminMiddleware } = require('../controllers/auth')
const { uploadSignedContractPDF, handlePdfUploadError } = require('../middleware/pdfUpload')

// ============================================
// PUBLIC / USER ROUTES (auth only)
// ============================================
router.post('/registration/create', requireSingin, createRegistration)
router.get('/registration/my-registrations', requireSingin, getMyRegistrations)
router.post('/registration/:id/upload-contract', requireSingin, uploadSignedContractPDF, handlePdfUploadError, uploadSignedContract)

// ============================================
// ADMIN ROUTES (auth + admin)
// ============================================
router.get('/registration/pending', requireSingin, adminMiddleware, getPendingRegistrations)
router.get('/registration/by-school-year/:schoolYearId', requireSingin, adminMiddleware, getRegistrationsBySchoolYear)
router.get('/registration/stats/:schoolYearId', requireSingin, adminMiddleware, getSchoolYearStats)
router.patch('/registration/:id/approve', requireSingin, adminMiddleware, approveRegistration)
router.patch('/registration/:id/reject', requireSingin, adminMiddleware, rejectRegistration)
router.delete('/registration/:id', requireSingin, adminMiddleware, deleteRegistration)

// ============================================
// SHARED ROUTE (auth — ownership checked in controller)
// ============================================
router.get('/registration/:id', requireSingin, getRegistration)

module.exports = router
