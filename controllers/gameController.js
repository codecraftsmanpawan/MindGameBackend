const mongoose = require('mongoose');
const Game = require('../models/Game');
const Bet = require('../models/Bet');
const Client = require('../models/Client');

// Controller function to get the latest ongoing games for each mode
exports.getOngoingGames = async (req, res) => {
    try {
        // Get the latest ongoing game for blackWhite mode
        const latestBlackWhiteGame = await Game.findOne({ mode: 'blackWhite', status: 'running' })
            .sort({ startTime: -1 });

        // Get the latest ongoing game for tenColors mode
        const latestTenColorsGame = await Game.findOne({ mode: 'tenColors', status: 'running' })
            .sort({ startTime: -1 });

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
        // Find the game by ID
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Check if results are already declared
        if (game.status === 'completed') {
            return res.status(400).json({ error: 'Results already declared for this game.' });
        }

        // Update game with results and set status to 'completed'
        game.results = results;
        game.status = 'completed';
        await game.save();

        // Update clients' budgets based on game results
        const bets = await Bet.find({ gameId: id });

        for (const bet of bets) {
            const isWin = bet.color === results;

            // Find the client and update budget
            try {
                const client = await Client.findById(bet.clientId);
                if (!client) {
                    console.error(`Client with ID ${bet.clientId} not found for updating budget.`);
                    continue;
                }

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

                client.budget += winnings;
                await client.save();
            } catch (err) {
                console.error(`Error updating budget for client with ID ${bet.clientId}:`, err);
            }
        }

        // Schedule game status update to 'completed' after 10 seconds
        setTimeout(async () => {
            try {
                const completedGame = await Game.findByIdAndUpdate(id, { status: 'completed' }, { new: true });
                if (!completedGame) {
                    console.error('Error completing game:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
            } catch (err) {
                console.error('Error completing game:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }, 10000);

        // Send response with updated game data
        res.status(200).json({
            success: true,
            data: game
        });
    } catch (err) {
        console.error('Error declaring results for game:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Other controller functions as needed

module.exports = exports;
