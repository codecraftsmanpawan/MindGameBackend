const Game = require('../models/Game');

// Function to fetch results of the last played games by mode
const getLastGameResultsByMode = async (req, res) => {
    try {
        // Find the last completed game for blackWhite mode
        const lastBlackWhiteGame = await Game.findOne({ mode: 'blackWhite', status: 'completed' }).sort({ endTime: -1 });

        // Find the last completed game for tenColors mode
        const lastTenColorsGame = await Game.findOne({ mode: 'tenColors', status: 'completed' }).sort({ endTime: -1 });

        // Prepare response data
        const results = {
            blackWhite: lastBlackWhiteGame ? {
                gameId: lastBlackWhiteGame.gameId,
                mode: lastBlackWhiteGame.mode,
                endTime: lastBlackWhiteGame.endTime,
                results: lastBlackWhiteGame.results // Adjust if results field is populated differently in your Game model
            } : null,
            tenColors: lastTenColorsGame ? {
                gameId: lastTenColorsGame.gameId,
                mode: lastTenColorsGame.mode,
                endTime: lastTenColorsGame.endTime,
                results: lastTenColorsGame.results // Adjust if results field is populated differently in your Game model
            } : null
        };

        return res.json(results);

    } catch (error) {
        console.error('Error fetching last game results:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getLastGameResultsByMode
};
