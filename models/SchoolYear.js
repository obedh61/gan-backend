const mongoose = require('mongoose');

const schoolYearSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        startMonth: {
            type: String,
            required: true
        },
        startYear: {
            type: Number,
            required: true
        },
        endMonth: {
            type: String,
            required: true
        },
        endYear: {
            type: Number,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        contracts: {
            cityCenterUnderOne: { type: String, default: '' },
            cityCenterOverOne: { type: String, default: '' },
            germanColonyUnderOne: { type: String, default: '' },
            germanColonyOverOne: { type: String, default: '' }
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
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
schoolYearSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// methods
schoolYearSchema.methods = {
    getContractUrl: function (branch, ageGroup) {
        const key = branch === 'cityCenter'
            ? (ageGroup === 'underOne' ? 'cityCenterUnderOne' : 'cityCenterOverOne')
            : (ageGroup === 'underOne' ? 'germanColonyUnderOne' : 'germanColonyOverOne');
        return this.contracts[key] || '';
    }
};

module.exports = mongoose.model('SchoolYear', schoolYearSchema);
