const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    gameId: { type: String, unique: true },
    mode: { type: String, enum: ['blackWhite', 'tenColors'], required: true },
    status: { type: String, enum: ['waiting', 'running', 'completed'], default: 'waiting' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    results: { type: String },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
}, {
    toJSON: { virtuals: true },
    timestamps: true,
});

// Virtual field for countdown
GameSchema.virtual('countdown').get(function() {
    if (this.endTime && this.status === 'running') {
        const now = new Date();
        const diff = Math.max(0, this.endTime - now);
        return Math.ceil(diff / 1000);
    }
    return 0;
});

// Pre-save hook to generate unique gameId
GameSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const prefix = this.mode === 'blackWhite' ? 'BW' : 'TC';
            let nextNumber = 1;
            let newGameId;

            // Ensure unique gameId
            while (true) {
                newGameId = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
                const existingGame = await this.constructor.findOne({ gameId: newGameId });
                if (!existingGame) break;
                nextNumber++;
            }

            this.gameId = newGameId;

            const gameDuration = this.mode === 'blackWhite' ? 15 * 60 * 1000 : 15 * 60 * 1000;
            this.endTime = new Date(Date.now() + gameDuration);
        } catch (error) {
            console.error('Error generating game ID:', error);
            return next(new Error('Error generating game ID'));
        }
    }
    next();
});

module.exports = mongoose.model('Game', GameSchema);
