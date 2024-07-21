const mongoose = require('mongoose');
const { generateResults } = require('../utils/generateResults'); // Adjust the path as necessary

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
            const prefix = this.mode === 'blackWhite' ? 'BW' : 'TC';
            const lastGame = await this.constructor.findOne({ mode: this.mode }).sort({ gameId: -1 });

            let nextNumber = 1;
            if (lastGame && lastGame.gameId) {
                const lastGameId = lastGame.gameId;
                const lastNumber = parseInt(lastGameId.substring(2));
                nextNumber = lastNumber + 1;
            }

            const paddedNumber = nextNumber.toString().padStart(4, '0');
            this.gameId = `${prefix}${paddedNumber}`;

            const gameDuration = 15 * 60 * 1000; // 15 minutes
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

            setTimeout(async () => {
                await this.endGame();
            }, 15 * 60 * 1000 + 10000); // 15 minutes + 10 seconds
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
            if (this.results) {
                console.log('Results already declared for this game.');
                return;
            }

            const results = await generateResults(this);

            this.status = 'completed';
            this.endTime = new Date();
            this.results = results;
            await this.save();

            const bets = await mongoose.model('Bet').find({ gameId: this._id });
            for (const bet of bets) {
                if (bet.color === results) {
                    const winningAmount = bet.amount * (this.mode === 'blackWhite' ? 1.9 : 9);
                    bet.winningAmount = winningAmount;
                    bet.result = 'win';
                    const client = await mongoose.model('Client').findById(bet.clientId);
                    client.budget += winningAmount;
                    await client.save();
                } else {
                    bet.result = 'loss';
                }
                await bet.save();
            }
        } catch (error) {
            console.error('Error ending the game:', error);
            throw new Error('Error ending the game');
        }
    }
};

// Static method to end all running games on server start
GameSchema.statics.endAllRunningGames = async function() {
    const runningGames = await this.find({ status: 'running' });
    for (const game of runningGames) {
        await game.endGame();
    }
};

module.exports = mongoose.model('Game', GameSchema);
