const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const masterUserSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    percentage: { type: Number, required: true, min: 0, max: 100 }, // Assuming percentage should be between 0 and 100
    brokarge: { type: Number, required: true, min: 0 }, // Assuming brokarge should be a non-negative number
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
});

// Add a pre-save hook to hash the password before saving
masterUserSchema.pre('save', async function(next) {
    try {
        if (this.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        this.updateDate = Date.now();
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('MasterUser', masterUserSchema);
