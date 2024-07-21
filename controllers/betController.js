const mongoose = require('mongoose');
const Bet = require('../models/Bet');
const Client = require('../models/Client');
const Game = require('../models/Game');

// Controller function to join a game and place a bet
exports.joinGame = async (req, res) => {
    try {
        const { clientId, gameId, amount, color, gameMode } = req.body;

        // Validate input
        if (!clientId || !gameId || !amount || !color || !gameMode) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(gameId)) {
            return res.status(400).json({ error: 'Invalid ObjectId format.' });
        }

        // Check if client exists
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found.' });
        }

        // Check if client has sufficient budget
        if (client.budget < amount) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }

        // Deduct bet amount from client's budget
        client.budget -= amount;
        await client.save();

        // Check if game exists and is in "running" state
        const game = await Game.findById(gameId);
        if (!game || game.status !== 'running') {
            return res.status(404).json({ error: 'Game not found or game is not running.' });
        }

        // Add client to players array if not already present
        if (!game.players.includes(clientId)) {
            game.players.push(clientId);
            await game.save();
        }

        // Create a new bet
        const newBet = new Bet({
            clientId,
            gameId,
            amount,
            color,
            gameMode
        });

        // Save the bet
        await newBet.save();

        // Return success message and the newly created bet
        res.status(201).json({ message: 'Bet successfully placed.', bet: newBet });
    } catch (error) {
        // Handle errors and log them
        console.error('Error in joinGame:', error);
        res.status(500).json({ error: 'An error occurred while placing the bet.' });
    }
};

// Controller function to declare results for a game and update status
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


// Controller function to fetch bets for a specific client
exports.getClientBets = async (req, res) => {
    try {
        const clientId = req.params.clientId;

        // Validate ObjectId format of clientId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ error: 'Invalid ObjectId format.' });
        }

        // Find client by clientId
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found.' });
        }

        // Find bets for the client, populate gameId to get results from Game schema
        const clientBets = await Bet.aggregate([
            { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
            {
                $lookup: {
                    from: 'games',
                    localField: 'gameId',
                    foreignField: '_id',
                    as: 'game'
                }
            },
            {
                $unwind: '$game'
            },
            {
                $project: {
                    _id: 1,
                    amount: 1,
                    color: 1,
                    gameMode: 1,
                    timestamp: 1,
                    gameId: '$game.gameId', // Add gameId here
                    results: '$game.results',
                    status: '$game.status',
                    gameOutcome: {
                        $cond: {
                            if: { $eq: ['$color', '$game.results'] },
                            then: 'win',
                            else: 'loss'
                        }
                    }
                }
            }
        ]);

        // Return clientBets as JSON response
        res.status(200).json({ clientBets });
    } catch (error) {
        // Handle errors and log them
        console.error('Error in getClientBets:', error);
        res.status(500).json({ error: 'An error occurred while fetching client bets.' });
    }
};

// Controller function to fetch current bets (games in "running" state) for a specific client
exports.getCurrentBets = async (req, res) => {
    try {
        const clientId = req.params.clientId;

        // Validate ObjectId format of clientId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ error: 'Invalid ObjectId format.' });
        }

        // Find client by clientId
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found.' });
        }

        // Find current bets for the client, where gameId status is "running"
        const currentBets = await Bet.aggregate([
            { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
            {
                $lookup: {
                    from: 'games',
                    localField: 'gameId',
                    foreignField: '_id',
                    as: 'game'
                }
            },
            {
                $unwind: '$game'
            },
            {
                $match: { 'game.status': 'running' }
            },
            {
                $project: {
                    _id: 1,
                    amount: 1,
                    color: 1,
                    gameMode: 1,
                    timestamp: 1,
                    gameId: '$game.gameId', // Add gameId here
                    results: '$game.results',
                    status: '$game.status'
                }
            }
        ]);

        // Return currentBets as JSON response
        res.status(200).json({ currentBets });
    } catch (error) {
        // Handle errors and log them
        console.error('Error in getCurrentBets:', error);
        res.status(500).json({ error: 'An error occurred while fetching current bets.' });
    }
};
