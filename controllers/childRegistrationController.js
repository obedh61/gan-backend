const ChildRegistration = require('../models/ChildRegistration')
const SchoolYear = require('../models/SchoolYear')
const User = require('../models/user')
const { uploadContractPDF, deleteContractPDF } = require('../utils/cloudinaryUpload')

// Map ageGroup values (under1/over1) to SchoolYear model format (underOne/overOne)
const ageGroupMap = { under1: 'underOne', over1: 'overOne' }

// ============================================
// PUBLIC / USER ROUTES (auth only)
// ============================================

// 1. POST /api/registration/create
exports.createRegistration = async (req, res) => {
    try {
        const {
            schoolYearId,
            parent1FirstName, parent1LastName, parent1IdNumber,
            parent2FirstName, parent2LastName, parent2IdNumber,
            childName, phoneNumber, bankName, bankAccountNumber,
            ageGroup, branch
        } = req.body

        // Validate required fields
        if (!schoolYearId || !parent1FirstName || !parent1LastName || !parent1IdNumber ||
            !parent2FirstName || !parent2LastName || !parent2IdNumber ||
            !childName || !phoneNumber || !bankName || !bankAccountNumber ||
            !ageGroup || !branch) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            })
        }

        // Validate enum values
        if (!['under1', 'over1'].includes(ageGroup)) {
            return res.status(400).json({
                success: false,
                error: 'ageGroup must be under1 or over1'
            })
        }
        if (!['cityCenter', 'germanColony'].includes(branch)) {
            return res.status(400).json({
                success: false,
                error: 'branch must be cityCenter or germanColony'
            })
        }

        // Verify school year exists and is active
        const schoolYear = await SchoolYear.findById(schoolYearId).exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }
        if (!schoolYear.isActive) {
            return res.status(400).json({
                success: false,
                error: 'This school year is not currently accepting registrations'
            })
        }

        // Get the appropriate contract URL based on branch + ageGroup
        const mappedAgeGroup = ageGroupMap[ageGroup]
        const assignedContractUrl = schoolYear.getContractUrl(branch, mappedAgeGroup)

        const registration = new ChildRegistration({
            schoolYear: schoolYearId,
            registeredBy: req.auth._id,
            parent1FirstName,
            parent1LastName,
            parent1IdNumber,
            parent2FirstName,
            parent2LastName,
            parent2IdNumber,
            childName,
            phoneNumber,
            bankName,
            bankAccountNumber,
            ageGroup,
            branch,
            assignedContractUrl,
            status: 'pending'
        })

        const saved = await registration.save()
        const populated = await ChildRegistration.findById(saved._id)
            .populate('schoolYear', 'name')
            .exec()

        res.json({ success: true, data: populated })
    } catch (err) {
        console.log('CREATE REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error creating registration'
        })
    }
}

// 2. POST /api/registration/:id/upload-contract
exports.uploadSignedContract = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded'
            })
        }

        const registration = await ChildRegistration.findById(req.params.id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            })
        }

        // Verify user owns this registration
        if (registration.registeredBy.toString() !== req.auth._id) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to upload contract for this registration'
            })
        }

        // Delete old signed contract from Cloudinary if replacing
        if (registration.uploadedContractPublicId) {
            await deleteContractPDF(registration.uploadedContractPublicId).catch(() => {})
        }

        // Upload PDF to Cloudinary in 'gan-signed-contracts' folder
        const result = await uploadContractPDF(req.file.buffer, 'gan-signed-contracts')

        // Update registration with Cloudinary URL and publicId
        registration.uploadedContractUrl = result.url
        registration.uploadedContractPublicId = result.publicId
        const updated = await registration.save()

        res.json({
            success: true,
            message: 'Signed contract uploaded successfully',
            data: updated
        })
    } catch (err) {
        console.log('UPLOAD SIGNED CONTRACT ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error uploading signed contract'
        })
    }
}

// 3. GET /api/registration/my-registrations
exports.getMyRegistrations = async (req, res) => {
    try {
        const registrations = await ChildRegistration.find({
            registeredBy: req.auth._id
        })
            .populate('schoolYear', 'name')
            .sort({ createdAt: -1 })
            .exec()

        res.json({ success: true, data: registrations })
    } catch (err) {
        console.log('GET MY REGISTRATIONS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching registrations'
        })
    }
}

// 4. GET /api/registration/:id
exports.getRegistration = async (req, res) => {
    try {
        const registration = await ChildRegistration.findById(req.params.id)
            .populate('schoolYear', 'name startMonth startYear endMonth endYear')
            .populate('registeredBy', 'name email')
            .populate('reviewedBy', 'name')
            .exec()

        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            })
        }

        // Permission check: user must own it OR be admin
        const user = await User.findById(req.auth._id).select('role').exec()
        const isOwner = registration.registeredBy._id.toString() === req.auth._id
        const isAdmin = user && user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this registration'
            })
        }

        res.json({ success: true, data: registration })
    } catch (err) {
        console.log('GET REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching registration'
        })
    }
}

// ============================================
// ADMIN ROUTES (auth + admin middleware)
// ============================================

// 5. GET /api/registration/pending
exports.getPendingRegistrations = async (req, res) => {
    try {
        const registrations = await ChildRegistration.find({ status: 'pending' })
            .populate('schoolYear', 'name')
            .populate('registeredBy', 'name')
            .sort({ createdAt: -1 })
            .exec()

        res.json({ success: true, data: registrations })
    } catch (err) {
        console.log('GET PENDING REGISTRATIONS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching pending registrations'
        })
    }
}

// 6. GET /api/registration/by-school-year/:schoolYearId
exports.getRegistrationsBySchoolYear = async (req, res) => {
    try {
        const query = { schoolYear: req.params.schoolYearId }

        // Optional filter by status
        if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
            query.status = req.query.status
        }

        const registrations = await ChildRegistration.find(query)
            .populate('schoolYear', 'name')
            .populate('registeredBy', 'name email')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 })
            .exec()

        res.json({ success: true, data: registrations })
    } catch (err) {
        console.log('GET REGISTRATIONS BY SCHOOL YEAR ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching registrations for school year'
        })
    }
}

// 7. PATCH /api/registration/:id/approve
exports.approveRegistration = async (req, res) => {
    try {
        const registration = await ChildRegistration.findById(req.params.id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            })
        }

        if (registration.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot approve. Registration is already ${registration.status}`
            })
        }

        registration.status = 'approved'
        registration.reviewedBy = req.auth._id
        registration.reviewedAt = new Date()
        const updated = await registration.save()

        const populated = await ChildRegistration.findById(updated._id)
            .populate('schoolYear', 'name')
            .populate('registeredBy', 'name email')
            .populate('reviewedBy', 'name')
            .exec()

        res.json({
            success: true,
            message: 'Registration approved successfully',
            data: populated
        })
    } catch (err) {
        console.log('APPROVE REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error approving registration'
        })
    }
}

// 8. PATCH /api/registration/:id/reject
exports.rejectRegistration = async (req, res) => {
    try {
        const { rejectionReason } = req.body
        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            })
        }

        const registration = await ChildRegistration.findById(req.params.id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            })
        }

        if (registration.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot reject. Registration is already ${registration.status}`
            })
        }

        registration.status = 'rejected'
        registration.rejectionReason = rejectionReason
        registration.reviewedBy = req.auth._id
        registration.reviewedAt = new Date()
        const updated = await registration.save()

        const populated = await ChildRegistration.findById(updated._id)
            .populate('schoolYear', 'name')
            .populate('registeredBy', 'name email')
            .populate('reviewedBy', 'name')
            .exec()

        res.json({
            success: true,
            message: 'Registration rejected',
            data: populated
        })
    } catch (err) {
        console.log('REJECT REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error rejecting registration'
        })
    }
}

// 9. DELETE /api/registration/:id
exports.deleteRegistration = async (req, res) => {
    try {
        const registration = await ChildRegistration.findById(req.params.id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            })
        }

        // Delete uploaded contract from Cloudinary if exists
        if (registration.uploadedContractPublicId) {
            await deleteContractPDF(registration.uploadedContractPublicId).catch(() => {})
        }

        await ChildRegistration.findByIdAndDelete(req.params.id).exec()

        res.json({
            success: true,
            message: 'Registration deleted successfully'
        })
    } catch (err) {
        console.log('DELETE REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error deleting registration'
        })
    }
}

// 10. GET /api/registration/stats/:schoolYearId
exports.getSchoolYearStats = async (req, res) => {
    try {
        const schoolYearId = req.params.schoolYearId

        // Verify school year exists
        const schoolYear = await SchoolYear.findById(schoolYearId).select('name').exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }

        const [total, pending, approved, rejected] = await Promise.all([
            ChildRegistration.countDocuments({ schoolYear: schoolYearId }).exec(),
            ChildRegistration.countDocuments({ schoolYear: schoolYearId, status: 'pending' }).exec(),
            ChildRegistration.countDocuments({ schoolYear: schoolYearId, status: 'approved' }).exec(),
            ChildRegistration.countDocuments({ schoolYear: schoolYearId, status: 'rejected' }).exec()
        ])

        res.json({
            success: true,
            data: { total, pending, approved, rejected }
        })
    } catch (err) {
        console.log('GET SCHOOL YEAR STATS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching registration statistics'
        })
    }
}
