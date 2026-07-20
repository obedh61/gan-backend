const mongoose = require('mongoose')
const ChildRegistration = require('../models/ChildRegistration')
const SchoolYear = require('../models/SchoolYear')
const User = require('../models/user')
const { uploadContractPDF, deleteContractPDF } = require('../utils/cloudinaryUpload')
const sendEmail = require('../utils/sendEmail')
const buildEmail = require('../utils/emailLayout')

// Map ageGroup values (under1/over1) to SchoolYear model format (underOne/overOne)
const ageGroupMap = { under1: 'underOne', over1: 'overOne' }

const isValidObjectId = (id) => mongoose.isValidObjectId(id)

const getPagination = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit
    return { page, limit, skip }
}

const sendStatusNotification = async (req, registration, status, rejectionReason = '') => {
    try {
        const recipient = registration.registeredBy?.email
        if (!recipient) return

        const childName = registration.childName
        const schoolYearName = registration.schoolYear?.name || req.t('reg.schoolYearNotFound')
        const lang = req.lang || 'en'

        if (status === 'approved') {
            const title = req.t('email.registrationApproval.heading')
            const subject = req.t('email.registrationApproval.subject', { childName })
            const contentHtml = `
                <p style="font-size: 16px; line-height: 1.6;">${req.t('email.registrationApproval.intro', { childName, schoolYearName })}</p>
                <div style="background-color: #f4f6f5; border-left: 4px solid #4A7B59; padding: 16px; margin: 20px 0; border-radius: 6px;">
                    <p style="margin: 0; color: #333333;">${req.t('email.registrationApproval.contractReminder')}</p>
                </div>
            `
            const html = buildEmail({ title, contentHtml, t: req.t, lang })
            const text = `${req.t('email.registrationApproval.intro', { childName, schoolYearName })}\n\n${req.t('email.registrationApproval.contractReminder')}`

            await sendEmail({ to: recipient, subject, text, html })
        } else {
            const title = req.t('email.registrationRejection.heading')
            const subject = req.t('email.registrationRejection.subject', { childName })
            const contentHtml = `
                <p style="font-size: 16px; line-height: 1.6;">${req.t('email.registrationRejection.intro', { childName, schoolYearName })}</p>
                <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 16px; margin: 20px 0; border-radius: 6px;">
                    <p style="margin: 0; color: #333333;"><strong>${req.t('email.registrationRejection.reasonLabel')}:</strong> ${rejectionReason}</p>
                </div>
                <p style="font-size: 16px; line-height: 1.6;">${req.t('email.registrationRejection.contact')}</p>
            `
            const html = buildEmail({ title, contentHtml, t: req.t, lang })
            const text = `${req.t('email.registrationRejection.intro', { childName, schoolYearName })}\n\n${req.t('email.registrationRejection.reasonLabel')}: ${rejectionReason}\n${req.t('email.registrationRejection.contact')}`

            await sendEmail({ to: recipient, subject, text, html })
        }
    } catch (err) {
        console.log('STATUS NOTIFICATION EMAIL ERROR', err)
    }
}

const sendAdminNotification = async (req, registration) => {
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
        const schoolYearName = registration.schoolYear?.name || req.t('reg.schoolYearNotFound')
        const registeredBy = registration.registeredBy
        const adminUrl = process.env.ADMIN_URL || 'https://gansecondhome.com/#/admin/registrations'
        const lang = req.lang || 'en'

        const title = req.t('email.newRegistrationAdmin.heading')
        const subject = req.t('email.newRegistrationAdmin.subject', { childName })
        const text = `${req.t('email.newRegistrationAdmin.intro', { childName, schoolYearName })}\n\n` +
            `${req.t('email.newRegistrationAdmin.branchLabel')}: ${registration.branch}\n` +
            `${req.t('email.newRegistrationAdmin.ageGroupLabel')}: ${registration.ageGroup}\n` +
            `${req.t('email.newRegistrationAdmin.parent1Label')}: ${registration.parent1FirstName} ${registration.parent1LastName} (${registration.parent1IdNumber})\n` +
            `${req.t('email.newRegistrationAdmin.parent2Label')}: ${registration.parent2FirstName} ${registration.parent2LastName} (${registration.parent2IdNumber})\n` +
            `${req.t('email.newRegistrationAdmin.submittedByLabel')}: ${registeredBy?.name || '-'} (${registeredBy?.email || '-'})\n\n` +
            `${req.t('email.newRegistrationAdmin.review')}: ${adminUrl}`

        const contentHtml = `
            <p style="font-size: 16px; line-height: 1.6;">${req.t('email.newRegistrationAdmin.intro', { childName, schoolYearName })}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #fafafa; border-radius: 8px; overflow: hidden;">
                <tr>
                    <td style="padding: 16px;">
                        <p style="margin: 8px 0; color: #333333;"><strong>${req.t('email.newRegistrationAdmin.branchLabel')}:</strong> ${registration.branch}</p>
                        <p style="margin: 8px 0; color: #333333;"><strong>${req.t('email.newRegistrationAdmin.ageGroupLabel')}:</strong> ${registration.ageGroup}</p>
                        <p style="margin: 8px 0; color: #333333;"><strong>${req.t('email.newRegistrationAdmin.parent1Label')}:</strong> ${registration.parent1FirstName} ${registration.parent1LastName} (${registration.parent1IdNumber})</p>
                        <p style="margin: 8px 0; color: #333333;"><strong>${req.t('email.newRegistrationAdmin.parent2Label')}:</strong> ${registration.parent2FirstName} ${registration.parent2LastName} (${registration.parent2IdNumber})</p>
                        <p style="margin: 8px 0; color: #333333;"><strong>${req.t('email.newRegistrationAdmin.submittedByLabel')}:</strong> ${registeredBy?.name || '-'} (${registeredBy?.email || '-'})</p>
                    </td>
                </tr>
            </table>
            <p style="text-align: center; margin: 28px 0;">
                <a href="${adminUrl}" style="display: inline-block; background-color: #4A7B59; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">${req.t('email.newRegistrationAdmin.review')}</a>
            </p>
        `
        const html = buildEmail({ title, contentHtml, t: req.t, lang })

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
                error: req.t('reg.allFieldsRequired')
            })
        }

        // Validate enum values
        if (!['under1', 'over1'].includes(ageGroup)) {
            return res.status(400).json({
                success: false,
                error: req.t('reg.invalidAgeGroup')
            })
        }
        if (!['cityCenter', 'germanColony', 'rachelImenu'].includes(branch)) {
            return res.status(400).json({
                success: false,
                error: req.t('reg.invalidBranch')
            })
        }

        // Validate schoolYearId format
        if (!isValidObjectId(schoolYearId)) {
            return res.status(400).json({
                success: false,
                error: req.t('reg.invalidSchoolYearId')
            })
        }

        // Verify school year exists and is active
        const schoolYear = await SchoolYear.findById(schoolYearId).exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: req.t('reg.schoolYearNotFound')
            })
        }
        if (!schoolYear.isActive) {
            return res.status(400).json({
                success: false,
                error: req.t('reg.schoolYearClosed')
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
                error: req.t('reg.alreadyExists')
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
        sendAdminNotification(req, populated).catch(err => console.log('ADMIN NOTIFICATION ERROR', err))

        res.json({ success: true, data: populated })
    } catch (err) {
        console.log('CREATE REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: req.t('reg.createError')
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
                error: req.t('reg.invalidId')
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: req.t('reg.noPdfUploaded')
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: req.t('reg.notFound')
            })
        }

        // Verify user owns this registration
        if (registration.registeredBy.toString() !== req.auth._id) {
            return res.status(403).json({
                success: false,
                error: req.t('reg.notAuthorizedContract')
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
            message: req.t('reg.contractUploaded'),
            data: updated
        })
    } catch (err) {
        console.log('UPLOAD SIGNED CONTRACT ERROR', err)
        return res.status(500).json({
            success: false,
            error: req.t('reg.contractUploadError')
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
            error: req.t('reg.fetchError')
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
                error: req.t('reg.invalidSchoolYearId')
            })
        }

        const registrations = await ChildRegistration.find({ schoolYear: schoolYearId })
            .select('branch status ageGroup')
            .exec()

        const branches = {
            cityCenter: { total: 0, pending: 0, approved: 0, rejected: 0 },
            germanColony: { total: 0, pending: 0, approved: 0, rejected: 0 },
            rachelImenu: { total: 0, pending: 0, approved: 0, rejected: 0 }
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
            error: req.t('reg.breakdownError')
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
            error: req.t('reg.fetchError')
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
                error: req.t('reg.invalidId')
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
                error: req.t('reg.notFound')
            })
        }

        // Permission check: user must own it OR be admin
        const user = await User.findById(req.auth._id).select('role').exec()
        const isOwner = registration.registeredBy._id.toString() === req.auth._id
        const isAdmin = user && user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: req.t('reg.notAuthorizedView')
            })
        }

        res.json({ success: true, data: registration })
    } catch (err) {
        console.log('GET REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: req.t('reg.fetchOneError')
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
            error: req.t('reg.fetchPendingError')
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
                error: req.t('reg.invalidSchoolYearId')
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
            error: req.t('reg.fetchBySchoolYearError')
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
                error: req.t('reg.invalidId')
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: req.t('reg.notFound')
            })
        }

        if (registration.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: req.t('reg.cannotApprove', { status: registration.status })
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

        await sendStatusNotification(req, populated, 'approved')

        res.json({
            success: true,
            message: req.t('reg.approved'),
            data: populated
        })
    } catch (err) {
        console.log('APPROVE REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: req.t('reg.approveError')
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
                error: req.t('reg.invalidId')
            })
        }

        const { rejectionReason } = req.body
        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                error: req.t('reg.rejectionReasonRequired')
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: req.t('reg.notFound')
            })
        }

        if (registration.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: req.t('reg.cannotReject', { status: registration.status })
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

        await sendStatusNotification(req, populated, 'rejected', rejectionReason)

        res.json({
            success: true,
            message: req.t('reg.rejected'),
            data: populated
        })
    } catch (err) {
        console.log('REJECT REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: req.t('reg.rejectError')
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
                error: req.t('reg.invalidId')
            })
        }

        const registration = await ChildRegistration.findById(id).exec()
        if (!registration) {
            return res.status(404).json({
                success: false,
                error: req.t('reg.notFound')
            })
        }

        // Delete uploaded contract from Cloudinary if exists
        if (registration.uploadedContractPublicId) {
            await deleteContractPDF(registration.uploadedContractPublicId).catch(() => {})
        }

        await ChildRegistration.findByIdAndDelete(id).exec()

        res.json({
            success: true,
            message: req.t('reg.deleted')
        })
    } catch (err) {
        console.log('DELETE REGISTRATION ERROR', err)
        return res.status(500).json({
            success: false,
            error: req.t('reg.deleteError')
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
                error: req.t('reg.invalidSchoolYearId')
            })
        }

        // Verify school year exists
        const schoolYear = await SchoolYear.findById(schoolYearId).select('name').exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: req.t('reg.schoolYearNotFound')
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
            error: req.t('reg.statisticsError')
        })
    }
}
