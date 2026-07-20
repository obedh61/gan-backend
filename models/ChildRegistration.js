const mongoose = require('mongoose');

const childRegistrationSchema = new mongoose.Schema(
    {
        schoolYear: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SchoolYear',
            required: true
        },
        registeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        // Parent 1 Information
        parent1FirstName: {
            type: String,
            required: true,
            trim: true
        },
        parent1LastName: {
            type: String,
            required: true,
            trim: true
        },
        parent1IdNumber: {
            type: String,
            required: true,
            trim: true
        },

        // Parent 2 Information
        parent2FirstName: {
            type: String,
            required: true,
            trim: true
        },
        parent2LastName: {
            type: String,
            required: true,
            trim: true
        },
        parent2IdNumber: {
            type: String,
            required: true,
            trim: true
        },

        // Child Information
        childName: {
            type: String,
            required: true,
            trim: true
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },
        bankName: {
            type: String,
            required: true,
            trim: true
        },
        bankAccountNumber: {
            type: String,
            required: true,
            trim: true
        },
        ageGroup: {
            type: String,
            enum: ['under1', 'over1'],
            required: true
        },
        branch: {
            type: String,
            enum: ['cityCenter', 'germanColony', 'rachelImenu'],
            required: true
        },

        // Contract Information
        assignedContractUrl: {
            type: String,
            default: ''
        },
        uploadedContractUrl: {
            type: String,
            default: ''
        },
        uploadedContractPublicId: {
            type: String,
            default: ''
        },

        // Status
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        rejectionReason: {
            type: String
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: {
            type: Date
        },

        // Timestamps
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date
        }
    }
);

// Update updatedAt before saving
childRegistrationSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Indexes
childRegistrationSchema.index({ schoolYear: 1 });
childRegistrationSchema.index({ registeredBy: 1 });
childRegistrationSchema.index({ status: 1 });

module.exports = mongoose.model('ChildRegistration', childRegistrationSchema);
