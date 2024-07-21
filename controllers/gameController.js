const mongoose = require('mongoose');
const Game = require('../models/Game');
const Bet = require('../models/Bet');
const Client = require('../models/Client');
const { generateResults } = require('../utils/generateResults'); // Import the function to generate results

// Controller function to get the latest ongoing games for each mode
exports.getOngoingGames = async (req, res) => {
    try {
        const now = new Date();

        // Get the latest ongoing game for blackWhite mode
        const latestBlackWhiteGame = await Game.findOne({ mode: 'blackWhite', status: 'running' })
            .sort({ startTime: -1 });

        // Get the latest ongoing game for tenColors mode
        const latestTenColorsGame = await Game.findOne({ mode: 'tenColors', status: 'running' })
            .sort({ startTime: -1 });

        // Calculate countdown for each game
        if (latestBlackWhiteGame) {
            latestBlackWhiteGame.countdown = Math.max(0, Math.floor((latestBlackWhiteGame.endTime - now) / 1000));
        }
        if (latestTenColorsGame) {
            latestTenColorsGame.countdown = Math.max(0, Math.floor((latestTenColorsGame.endTime - now) / 1000));
        }

        // Combine the results
        const ongoingGames = [];
        if (latestBlackWhiteGame) ongoingGames.push(latestBlackWhiteGame);
        if (latestTenColorsGame) ongoingGames.push(latestTenColorsGame);

        res.status(200).json({
            success: true,
            count: ongoingGames.length,
            data: ongoingGames
        });
    } catch (err) {
        console.error('Error fetching ongoing games:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to get completed games
exports.getCompletedGames = async (req, res) => {
    try {
        const completedGames = await Game.find({ status: 'completed' });
        res.status(200).json({
            success: true,
            count: completedGames.length,
            data: completedGames
        });
    } catch (err) {
        console.error('Error fetching completed games:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to get all games
exports.getAllGames = async (req, res) => {
    try {
        const allGames = await Game.find();
        res.status(200).json({
            success: true,
            count: allGames.length,
            data: allGames
        });
    } catch (err) {
        console.error('Error fetching all games:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to get a game by ID
exports.getGameById = async (req, res) => {
    const { id } = req.params;

    try {
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.status(200).json({
            success: true,
            data: game
        });
    } catch (err) {
        console.error('Error fetching game by ID:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to create a new game
exports.createGame = async (req, res) => {
    try {
        const { mode } = req.body;
        const newGame = new Game({ mode });
        await newGame.save();
        res.status(201).json({
            success: true,
            data: newGame
        });
    } catch (err) {
        console.error('Error creating game:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to update a game by ID
exports.updateGameById = async (req, res) => {
    const { id } = req.params;
    const { mode } = req.body;

    try {
        const updatedGame = await Game.findByIdAndUpdate(id, { mode }, { new: true });
        if (!updatedGame) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.status(200).json({
            success: true,
            data: updatedGame
        });
    } catch (err) {
        console.error('Error updating game:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to delete a game by ID
exports.deleteGameById = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedGame = await Game.findByIdAndDelete(id);
        if (!deletedGame) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error('Error deleting game:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to declare results for a game and update status
exports.declareResults = async (req, res) => {
    const { id } = req.params;
    const { results } = req.body;

    try {
        const game = await Game.findByIdAndUpdate(id, { results, status: 'resultDeclared' }, { new: true });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Update clients' budgets based on game results
        const bets = await Bet.find({ gameId: id });

        for (const bet of bets) {
            const isWin = bet.color === results; // Assuming results are directly the color

            const client = await Client.findById(bet.clientId);
            if (!client) {
                console.error(`Client with ID ${bet.clientId} not found for updating budget.`);
                continue;
            }

            // Calculate winnings and update client's budget
            let winnings = 0;
            if (bet.gameMode === 'blackWhite') {
                if (isWin) {
                    winnings = bet.amount * 1.9; // Win 90% profit
                }
            } else if (bet.gameMode === 'tenColors') {
                if (isWin) {
                    winnings = bet.amount * 9; // Win 8 times the amount
                }
            }

            // Update client's budget
            client.budget += winnings;
            await client.save();
        }

        // Send immediate response
        res.status(200).json({
            success: true,
            data: game
        });

        // After 10 seconds, update status to 'completed'
        setTimeout(async () => {
            try {
                const completedGame = await Game.findByIdAndUpdate(id, { status: 'completed' }, { new: true });
                if (!completedGame) {
                    console.error('Error completing game:', err);
                }
            } catch (err) {
                console.error('Error updating game status to completed:', err);
            }
        }, 10000);
    } catch (err) {
        console.error('Error declaring results for game:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to add results for blackWhite games before the end of the 30-second timer
exports.addBlackWhiteResultsBeforeEnd = async (req, res) => {
    const { id } = req.params;
    const { results } = req.body;

    try {
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.status !== 'running') {
            return res.status(400).json({ error: 'Game must be in running status to add results' });
        }

        const now = new Date();
        const timeRemaining = Math.floor((game.endTime - now) / 1000);
        if (timeRemaining < 0 || timeRemaining > 30) {
            return res.status(400).json({ error: 'Results can only be added within 30 seconds of the endTime' });
        }

        if (results !== 'Black' && results !== 'White') {
            return res.status(400).json({ error: 'Invalid result for blackWhite mode' });
        }

        game.results = results;
        game.status = 'completed'; // Ensure the status is updated to completed
        await game.save();

        await updateClientBudgets(id, results, 'blackWhite');

        res.status(200).json({
            success: true,
            data: game
        });
    } catch (err) {
        console.error('Error adding blackWhite results before end:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to add results for tenColors games before the end of the 30-second timer
exports.addTenColorsResultsBeforeEnd = async (req, res) => {
    const { id } = req.params;
    const { results } = req.body;

    try {
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.status !== 'running') {
            return res.status(400).json({ error: 'Game must be in running status to add results' });
        }

        const now = new Date();
        const timeRemaining = Math.floor((game.endTime - now) / 1000);
        if (timeRemaining < 0 || timeRemaining > 30) {
            return res.status(400).json({ error: 'Results can only be added within 30 seconds of the endTime' });
        }

        if (!Array.isArray(results) || results.length !== 10) {
            return res.status(400).json({ error: 'Invalid results for tenColors mode' });
        }

        game.results = results;
        game.status = 'completed'; // Ensure the status is updated to completed
        await game.save();

        await updateClientBudgets(id, results, 'tenColors');

        res.status(200).json({
            success: true,
            data: game
        });
    } catch (err) {
        console.error('Error adding tenColors results before end:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Controller function to automatically declare results if not done manually
exports.autoDeclareResults = async () => {
    try {
        const now = new Date();
        const ongoingGames = await Game.find({ status: 'running' });

        for (const game of ongoingGames) {
            if (game.endTime < now) {
                // Auto-generate results if not done manually
                const results = generateResults(game.mode);
                await declareResults({ params: { id: game._id.toString() }, body: { results } }, {});
            }
        }
    } catch (err) {
        console.error('Error auto-declaring results:', err);
    }
};

// Helper function to update client budgets based on game results
async function updateClientBudgets(gameId, results, gameMode) {
    try {
        const bets = await Bet.find({ gameId });

        for (const bet of bets) {
            const isWin = (gameMode === 'blackWhite') ? bet.color === results : bet.color === results[0]; // Simplified logic

            const client = await Client.findById(bet.clientId);
            if (!client) {
                console.error(`Client with ID ${bet.clientId} not found for updating budget.`);
                continue;
            }

            let winnings = 0;
            if (gameMode === 'blackWhite') {
                if (isWin) {
                    winnings = bet.amount * 1.9; // Win 90% profit
                }
            } else if (gameMode === 'tenColors') {
                if (isWin) {
                    winnings = bet.amount * 9; // Win 8 times the amount
                }
            }

            client.budget += winnings;
            await client.save();
        }
    } catch (err) {
        console.error('Error updating client budgets:', err);
    }
}
