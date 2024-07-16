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

// Pre-save hook to generate gameId with 2 letters followed by 4 digits
GameSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            // Determine the prefix based on the mode
            const prefix = this.mode === 'blackWhite' ? 'BW' : 'TC';

            // Find the last game ID for the current mode
            const lastGame = await this.constructor.findOne({ mode: this.mode }).sort({ gameId: -1 });

            let nextNumber = 1;
            if (lastGame && lastGame.gameId) {
                const lastGameId = lastGame.gameId;
                const lastNumber = parseInt(lastGameId.substring(2)); // Extract number part and convert to integer
                nextNumber = lastNumber + 1;
            }

            // Generate gameId based on mode and incremented number
            const paddedNumber = nextNumber.toString().padStart(4, '0');
            this.gameId = `${prefix}${paddedNumber}`;

            // Set endTime based on game mode
            const gameDuration = this.mode === 'blackWhite' ? 15 * 60 * 1000 : 15 * 60 * 1000; // 15 minutes in milliseconds for both modes
            this.endTime = new Date(Date.now() + gameDuration);
        } catch (error) {
            console.error('Error generating game ID:', error);
            return next(new Error('Error generating game ID'));
        }
    }
    next();
});

// Method to start the game
GameSchema.methods.startGame = async function() {
    if (this.status === 'waiting') {
        try {
            this.status = 'running';
            await this.save();

            // Automatically end the game after endTime has passed
            setTimeout(async () => {
                await this.endGame();
            }, 15 * 60 * 1000 + 10000); // 15 minutes + 10 seconds as buffer
        } catch (error) {
            console.error('Error starting the game:', error);
            throw new Error('Error starting the game');
        }
    }
};

// Method to end the game
GameSchema.methods.endGame = async function() {
    if (this.status === 'running') {
        try {
            // Clear game results
            this.results = undefined;

            // Update game status and endTime
            this.status = 'completed';
            this.endTime = new Date();
            await this.save();

            // Update associated bets (if any) - Example: Remove or update bets logic
            // await mongoose.model('Bet').updateMany({ gameId: this._id }, { $set: { result } });

            // Optionally, you can return or perform additional actions
            // return result;
        } catch (error) {
            console.error('Error ending the game:', error);
            throw new Error('Error ending the game');
        }
    }
};

module.exports = mongoose.model('Game', GameSchema);
