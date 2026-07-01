const mongoose = require('mongoose')
const ChildRegistration = require('../models/ChildRegistration')
const SchoolYear = require('../models/SchoolYear')
const User = require('../models/user')
const { uploadContractPDF, deleteContractPDF } = require('../utils/cloudinaryUpload')
const sendEmail = require('../utils/sendEmail')

// Map ageGroup values (under1/over1) to SchoolYear model format (underOne/overOne)
const ageGroupMap = { under1: 'underOne', over1: 'overOne' }

const isValidObjectId = (id) => mongoose.isValidObjectId(id)

const getPagination = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    return { page, limit, skip }
}

const sendStatusNotification = async (registration, status, rejectionReason = '') => {
    try {
        const recipient = registration.registeredBy?.email
        if (!recipient) return

        const childName = registration.childName
        const schoolYearName = registration.schoolYear?.name || 'the selected school year'
        const subject = status === 'approved'
            ? `Registration approved for ${childName}`
            : `Registration update for ${childName}`

        const html = status === 'approved'
            ? `<p>Hello,</p>
               <p>We are happy to inform you that the registration of <strong>${childName}</strong> for <strong>${schoolYearName}</strong> has been <strong>approved</strong>.</p>
               <p>If you have not uploaded the signed contract yet, you can do so from your registrations page.</p>
               <p>Best regards,<br>Gan Second Home</p>`
            : `<p>Hello,</p>
               <p>We regret to inform you that the registration of <strong>${childName}</strong> for <strong>${schoolYearName}</strong> has been <strong>rejected</strong>.</p>
               <p><strong>Reason:</strong> ${rejectionReason}</p>
               <p>If you believe this was a mistake, please contact the administration.</p>
               <p>Best regards,<br>Gan Second Home</p>`

        await sendEmail({
            to: recipient,
            subject,
            text: `Registration for ${childName} has been ${status}.`,
            html
        })
    } catch (err) {
        console.log('STATUS NOTIFICATION EMAIL ERROR', err)
    }
}

const sendAdminNotification = async (registration) => {
    try {
        let recipients = []
        if (process.env.EMAIL_TO) {
            recipients = process.env.EMAIL_TO.split(',').map(email => email.trim()).filter(Boolean)
        }

        if (recipients.length === 0) {
            const admins = await User.find({ role: 'admin' }).select('email').exec()
            recipients = admins.map(admin => admin.email).filter(Boolean)
        }

        if (recipients.length === 0) {
            console.log('ADMIN NOTIFICATION: no admin recipients configured')
            return
        }

        const childName = registration.childName
        const schoolYearName = registration.schoolYear?.name || 'Unknown school year'
        const registeredBy = registration.registeredBy
        const adminUrl = process.env.ADMIN_URL || 'https://gansecondhome.com/#/admin/registrations'

        const subject = `New child registration: ${childName}`
        const text = `A new registration has been submitted for ${childName} (${schoolYearName}).\n\n` +
            `Branch: ${registration.branch}\n` +
            `Age Group: ${registration.ageGroup}\n` +
            `Parent 1: ${registration.parent1FirstName} ${registration.parent1LastName} (${registration.parent1IdNumber})\n` +
            `Parent 2: ${registration.parent2FirstName} ${registration.parent2LastName} (${registration.parent2IdNumber})\n` +
            `Submitted by: ${registeredBy?.name || '-'} (${registeredBy?.email || '-'})\n\n` +
            `Review it here: ${adminUrl}`

        const html = `<p>A new registration has been submitted for <strong>${childName}</strong> (${schoolYearName}).</p>
            <ul>
                <li><strong>Branch:</strong> ${registration.branch}</li>
                <li><strong>Age Group:</strong> ${registration.ageGroup}</li>
                <li><strong>Parent 1:</strong> ${registration.parent1FirstName} ${registration.parent1LastName} (${registration.parent1IdNumber})</li>
                <li><strong>Parent 2:</strong> ${registration.parent2FirstName} ${registration.parent2LastName} (${registration.parent2IdNumber})</li>
                <li><strong>Submitted by:</strong> ${registeredBy?.name || '-'} (${registeredBy?.email || '-'})</li>
            </ul>
            <p><a href="${adminUrl}">Review registration</a></p>
            <p>Best regards,<br>Gan Second Home</p>`

        await sendEmail({
            to: recipients,
            subject,
            text,
            html
        })
    } catch (err) {
        console.log('ADMIN NOTIFICATION EMAIL ERROR', err)
    }
}

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

        // Validate schoolYearId format
        if (!isValidObjectId(schoolYearId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
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

        // Prevent duplicate registration for the same child by the same user in the same school year
        const existingRegistration = await ChildRegistration.findOne({
            schoolYear: schoolYearId,
            registeredBy: req.auth._id,
            childName: { $regex: new RegExp(`^${childName.trim()}$`, 'i') }
        }).exec()

        if (existingRegistration) {
            return res.status(409).json({
                success: false,
                error: 'A registration for this child already exists for the selected school year'
            })
        }

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
            .populate('registeredBy', 'name email')
            .exec()

        // Notify admins (fire-and-forget: do not fail the request if email fails)
        sendAdminNotification(populated).catch(err => console.log('ADMIN NOTIFICATION ERROR', err))

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
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID'
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded'
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
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

// 3. GET /api/registration/all (admin only)
exports.getAllRegistrations = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req)
        const query = {}

        // Optional filter by status
        if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
            query.status = req.query.status
        }

        // Optional search by child name or parent names
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search.trim(), 'i')
            query.$or = [
                { childName: searchRegex },
                { parent1FirstName: searchRegex },
                { parent1LastName: searchRegex },
                { parent2FirstName: searchRegex },
                { parent2LastName: searchRegex }
            ]
        }

        const [registrations, total] = await Promise.all([
            ChildRegistration.find(query)
                .populate('schoolYear', 'name')
                .populate('registeredBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            ChildRegistration.countDocuments(query).exec()
        ])

        res.json({
            success: true,
            data: registrations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.log('GET ALL REGISTRATIONS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching registrations'
        })
    }
}

// GET /api/registration/by-school-year/:schoolYearId/breakdown
exports.getRegistrationBreakdowns = async (req, res) => {
    try {
        const { schoolYearId } = req.params
        if (!isValidObjectId(schoolYearId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const registrations = await ChildRegistration.find({ schoolYear: schoolYearId })
            .select('branch status ageGroup')
            .exec()

        const branches = {
            cityCenter: { total: 0, pending: 0, approved: 0, rejected: 0 },
            germanColony: { total: 0, pending: 0, approved: 0, rejected: 0 }
        }
        const ages = {
            under1: { total: 0, pending: 0, approved: 0, rejected: 0 },
            over1: { total: 0, pending: 0, approved: 0, rejected: 0 }
        }

        registrations.forEach(reg => {
            if (branches[reg.branch]) {
                branches[reg.branch].total++
                branches[reg.branch][reg.status]++
            }
            if (ages[reg.ageGroup]) {
                ages[reg.ageGroup].total++
                ages[reg.ageGroup][reg.status]++
            }
        })

        res.json({
            success: true,
            data: { branches, ages }
        })
    } catch (err) {
        console.log('GET REGISTRATION BREAKDOWNS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching registration breakdowns'
        })
    }
}

// GET /api/registration/my-registrations
exports.getMyRegistrations = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req)
        const query = { registeredBy: req.auth._id }

        const [registrations, total] = await Promise.all([
            ChildRegistration.find(query)
                .populate('schoolYear', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            ChildRegistration.countDocuments(query).exec()
        ])

        res.json({
            success: true,
            data: registrations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
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
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID'
            })
        }

        const registration = await ChildRegistration.findById(id)
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
        const { page, limit, skip } = getPagination(req)

        const query = { status: 'pending' }
        const [registrations, total] = await Promise.all([
            ChildRegistration.find(query)
                .populate('schoolYear', 'name')
                .populate('registeredBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            ChildRegistration.countDocuments(query).exec()
        ])

        res.json({
            success: true,
            data: registrations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
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
        const { schoolYearId } = req.params
        if (!isValidObjectId(schoolYearId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const { page, limit, skip } = getPagination(req)
        const query = { schoolYear: schoolYearId }

        // Optional filter by status
        if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
            query.status = req.query.status
        }

        const [registrations, total] = await Promise.all([
            ChildRegistration.find(query)
                .populate('schoolYear', 'name')
                .populate('registeredBy', 'name email')
                .populate('reviewedBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            ChildRegistration.countDocuments(query).exec()
        ])

        res.json({
            success: true,
            data: registrations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
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
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID'
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
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

        await sendStatusNotification(populated, 'approved')

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
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID'
            })
        }

        const { rejectionReason } = req.body
        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
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

        await sendStatusNotification(populated, 'rejected', rejectionReason)

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
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID'
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
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

        await ChildRegistration.findByIdAndDelete(id).exec()

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
        const { schoolYearId } = req.params
        if (!isValidObjectId(schoolYearId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

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
