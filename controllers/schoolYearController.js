const mongoose = require('mongoose')
const SchoolYear = require('../models/SchoolYear')
const ChildRegistration = require('../models/ChildRegistration')
const { uploadContractPDF, deleteContractPDF } = require('../utils/cloudinaryUpload')

const isValidObjectId = (id) => mongoose.isValidObjectId(id)

const VALID_CONTRACT_TYPES = [
    'cityCenterUnderOne',
    'cityCenterOverOne',
    'germanColonyUnderOne',
    'germanColonyOverOne'
]

// Helper: extract Cloudinary publicId from a raw resource URL
// URL format: https://res.cloudinary.com/{cloud}/raw/upload/v{timestamp}/{publicId}
const extractPublicId = (url) => {
    if (!url) return null
    const match = url.match(/\/upload\/v\d+\/(.+)$/)
    return match ? match[1] : null
}

// POST /api/schoolyear/create
exports.createSchoolYear = async (req, res) => {
    try {
        const { name, startMonth, startYear, endMonth, endYear } = req.body

        // Validate required fields
        if (!name || !startMonth || !startYear || !endMonth || !endYear) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: name, startMonth, startYear, endMonth, endYear'
            })
        }

        const existing = await SchoolYear.findOne({ name }).exec()
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'School year with this name already exists'
            })
        }

        const schoolYear = new SchoolYear({
            name,
            startMonth,
            startYear,
            endMonth,
            endYear,
            createdBy: req.auth._id
        })

        const saved = await schoolYear.save()
        res.json({ success: true, data: saved })
    } catch (err) {
        console.log('CREATE SCHOOL YEAR ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error creating school year'
        })
    }
}

// GET /api/schoolyear/list
exports.listSchoolYears = async (req, res) => {
    try {
        const query = {}
        if (req.query.active === 'true') {
            query.isActive = true
        }
        if (req.query.active === 'false') {
            query.isActive = false
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50))
        const skip = (page - 1) * limit

        const [schoolYears, total] = await Promise.all([
            SchoolYear.find(query)
                .populate('createdBy', 'name')
                .sort({ startYear: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            SchoolYear.countDocuments(query).exec()
        ])

        res.json({
            success: true,
            data: schoolYears,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.log('LIST SCHOOL YEARS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching school years'
        })
    }
}

// GET /api/schoolyear/active
exports.getActiveSchoolYears = async (req, res) => {
    try {
        const schoolYears = await SchoolYear.find({ isActive: true })
            .select('name startMonth startYear endMonth endYear contracts')
            .sort({ startYear: -1 })
            .exec()

        res.json({ success: true, data: schoolYears })
    } catch (err) {
        console.log('GET ACTIVE SCHOOL YEARS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching active school years'
        })
    }
}

// GET /api/schoolyear/:id
exports.getSchoolYear = async (req, res) => {
    try {
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const schoolYear = await SchoolYear.findById(id)
            .populate('createdBy', 'name')
            .exec()

        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }

        res.json({ success: true, data: schoolYear })
    } catch (err) {
        console.log('GET SCHOOL YEAR ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching school year'
        })
    }
}

// PUT /api/schoolyear/:id/toggle-active
exports.toggleActiveStatus = async (req, res) => {
    try {
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const schoolYear = await SchoolYear.findById(id).exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }

        schoolYear.isActive = !schoolYear.isActive
        const updated = await schoolYear.save()
        res.json({
            success: true,
            message: `School year ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updated
        })
    } catch (err) {
        console.log('TOGGLE ACTIVE STATUS ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error toggling school year status'
        })
    }
}

// DELETE /api/schoolyear/:id
exports.deleteSchoolYear = async (req, res) => {
    try {
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const schoolYear = await SchoolYear.findById(id).exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }

        // Check if any registrations exist for this school year
        const registrationCount = await ChildRegistration.countDocuments({
            schoolYear: id
        }).exec()

        if (registrationCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete, has ${registrationCount} registration(s)`
            })
        }

        // Clean up contract PDFs from Cloudinary
        const contracts = schoolYear.contracts
        const deletePromises = []
        for (const field of VALID_CONTRACT_TYPES) {
            const publicId = extractPublicId(contracts[field])
            if (publicId) {
                deletePromises.push(deleteContractPDF(publicId).catch(() => {}))
            }
        }
        await Promise.all(deletePromises)

        await SchoolYear.findByIdAndDelete(id).exec()
        res.json({ success: true, message: 'School year deleted successfully' })
    } catch (err) {
        console.log('DELETE SCHOOL YEAR ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error deleting school year'
        })
    }
}

// POST /api/schoolyear/:id/upload-contract
exports.uploadContract = async (req, res) => {
    try {
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const { contractType } = req.body

        if (!VALID_CONTRACT_TYPES.includes(contractType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid contract type. Must be one of: ' + VALID_CONTRACT_TYPES.join(', ')
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded'
            })
        }

        const schoolYear = await SchoolYear.findById(id).exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }

        // Delete old contract from Cloudinary if one exists
        const oldUrl = schoolYear.contracts[contractType]
        const oldPublicId = extractPublicId(oldUrl)
        if (oldPublicId) {
            await deleteContractPDF(oldPublicId).catch(() => {})
        }

        // Upload new contract PDF
        const result = await uploadContractPDF(req.file.buffer, 'gan-contracts')

        // Update school year with new URL
        schoolYear.contracts[contractType] = result.url
        const updated = await schoolYear.save()

        res.json({
            success: true,
            message: 'Contract uploaded successfully',
            data: {
                contractType,
                url: result.url,
                publicId: result.publicId,
                schoolYear: updated
            }
        })
    } catch (err) {
        console.log('UPLOAD CONTRACT ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error uploading contract'
        })
    }
}

// GET /api/schoolyear/:id/contract
exports.getContractByParams = async (req, res) => {
    try {
        const { id } = req.params
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid school year ID'
            })
        }

        const { branch, ageGroup } = req.query

        if (!branch || !ageGroup) {
            return res.status(400).json({
                success: false,
                error: 'branch and ageGroup query params are required'
            })
        }

        const validBranches = ['cityCenter', 'germanColony']
        const validAgeGroups = ['under1', 'over1']

        if (!validBranches.includes(branch)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch. Must be one of: ' + validBranches.join(', ')
            })
        }

        if (!validAgeGroups.includes(ageGroup)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ageGroup. Must be one of: ' + validAgeGroups.join(', ')
            })
        }

        const schoolYear = await SchoolYear.findById(id).exec()
        if (!schoolYear) {
            return res.status(404).json({
                success: false,
                error: 'School year not found'
            })
        }

        // Map under1/over1 to underOne/overOne for the model method
        const ageGroupMap = { under1: 'underOne', over1: 'overOne' }
        const contractUrl = schoolYear.getContractUrl(branch, ageGroupMap[ageGroup])

        if (!contractUrl) {
            return res.status(404).json({
                success: false,
                error: 'No contract uploaded for this branch and age group'
            })
        }

        res.json({ success: true, data: { contractUrl } })
    } catch (err) {
        console.log('GET CONTRACT ERROR', err)
        return res.status(500).json({
            success: false,
            error: 'Error fetching contract'
        })
    }
}
