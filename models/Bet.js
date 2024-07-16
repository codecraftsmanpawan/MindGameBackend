const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }, // Reference to Client who placed the bet
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true }, // Reference to the Game on which the bet is placed
    amount: { type: Number, required: true, min: 0 }, // Bet amount, should be a non-negative number
    color: { type: String, required: true }, // Color chosen by the client for the bet
    gameMode: { type: String, required: true }, // Game mode (e.g., 'blackWhite', 'tenColor')
    timestamp: { type: Date, default: Date.now }, // Timestamp of when the bet was placed
    result: { type: String },
});

module.exports = mongoose.model('Bet', betSchema);
