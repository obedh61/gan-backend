const multer = require('multer')

// Memory storage — files stay in buffer for Cloudinary upload, never touch disk
const storage = multer.memoryStorage()

// Only accept PDF files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true)
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false)
    }
}

// Base multer config shared by both middlewares
const limits = { fileSize: 10 * 1024 * 1024 } // 10MB

// Admin uploading contract templates to school years
const uploadContractPDF = multer({ storage, fileFilter, limits }).single('contract')

// Parents uploading signed contracts
const uploadSignedContractPDF = multer({ storage, fileFilter, limits }).single('signedContract')

// Error handling middleware — place AFTER the route that uses multer
const handlePdfUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB'
            })
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are allowed'
            })
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        })
    }

    // Non-multer error — pass to next error handler
    next(err)
}

module.exports = {
    uploadContractPDF,
    uploadSignedContractPDF,
    handlePdfUploadError
}
