const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true }, // Unique code for the client
    budget: { type: Number, required: true }, // Budget assigned to the client
    masterCode: { type: String, required: true, index: true }, // Code of the master user associated with this client
    status: { type: String, required: true }, // Status of the client (e.g., 'active', 'inactive')
    username: { type: String, required: true, unique: true, index: true }, // Unique username for the client
    password: { type: String, required: true }, // Password for the client
    createDate: { type: Date, default: Date.now }, // Date when the client was created
    updateDate: { type: Date, default: Date.now }, // Date when the client was last updated
});

// Pre-save hook to update the updateDate field and format the budget field before saving
clientSchema.pre('save', function(next) {
    this.updateDate = Date.now();
    this.budget = parseFloat(this.budget.toFixed(2)); // Ensure budget is stored with only 2 digits after the decimal point
    next();
});

module.exports = mongoose.model('Client', clientSchema);
