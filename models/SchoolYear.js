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
            germanColonyOverOne: { type: String, default: '' },
            rachelImenuUnderOne: { type: String, default: '' },
            rachelImenuOverOne: { type: String, default: '' }
        },
        contractsHe: {
            cityCenterUnderOne: { type: String, default: '' },
            cityCenterOverOne: { type: String, default: '' },
            germanColonyUnderOne: { type: String, default: '' },
            germanColonyOverOne: { type: String, default: '' },
            rachelImenuUnderOne: { type: String, default: '' },
            rachelImenuOverOne: { type: String, default: '' }
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
    getContractUrl: function (branch, ageGroup, lang) {
        const key = `${branch}${ageGroup === 'underOne' ? 'UnderOne' : 'OverOne'}`;
        // Hebrew UI: prefer the Hebrew version, fall back to English if missing
        if (lang === 'he' && this.contractsHe && this.contractsHe[key]) {
            return this.contractsHe[key];
        }
        return this.contracts[key] || '';
    }
};

module.exports = mongoose.model('SchoolYear', schoolYearSchema);
