const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSettingsSchema = new Schema({
    resultMode: {
        type: String,
        enum: ['manual', 'automatic'],
        required: true,
        default: 'automatic'
    },
    manualResultBlackWhite: {
        type: String,
        enum: ['Black', 'White'],
        default: null
    },
    manualResultTenColors: {
        type: String,
        enum: ['Color0', 'Color1', 'Color2', 'Color3', 'Color4', 'Color5', 'Color6', 'Color7', 'Color8', 'Color9'],
        default: null
    }
}, {
    timestamps: true
});

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

module.exports = AdminSettings;
