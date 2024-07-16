const mongoose = require('mongoose');
const Game = require('../models/Game'); // Adjust the path as needed
const Bet = require('../models/Bet');   // Adjust the path as needed
const Client = require('../models/Client'); // Adjust the path as needed
const MasterUser = require('../models/MasterUser'); // Adjust the path as needed

// Function to fetch ongoing game details for black or white and ten-color games
const getOngoingGameDetails = async (req, res) => {
    try {
        // Find the most recent ongoing games for both modes
        const [blackWhiteGame, tenColorsGame] = await Promise.all([
            Game.findOne({ mode: 'blackWhite', status: 'running' }).sort({ startTime: -1 }),
            Game.findOne({ mode: 'tenColors', status: 'running' }).sort({ startTime: -1 })
        ]);

        // Prepare an array to store game details
        const games = [];

        // Function to fetch bet details for a specific game
        const fetchBetDetails = async (game) => {
            if (!game) return null;

            // Aggregate data related to the ongoing game
            const betDetails = await Bet.aggregate([
                { $match: { gameId: game._id } },
                {
                    $group: {
                        _id: '$color',
                        totalBetAmount: { $sum: '$amount' },
                        totalUsers: { $sum: 1 },
                        clients: { $push: { clientId: '$clientId', amount: '$amount' } }
                    }
                }
            ]);

            // Fetch clients and their master codes
            const clientIds = betDetails.flatMap(bet => bet.clients.map(client => client.clientId));
            const clients = await Client.find({ _id: { $in: clientIds } });
            const masterCodes = clients.map(client => client.masterCode);
            const masterUsers = await MasterUser.find({ code: { $in: masterCodes } });

            // Map clients to their master users and bet amounts
            const clientMasterMap = clients.map(client => ({
                clientId: client._id,
                masterCode: client.masterCode,
                masterUser: masterUsers.find(master => master.code === client.masterCode)
            }));

            // Calculate total final amount and format response data
            const responseData = betDetails.map(bet => {
                const totalFinalAmount = bet.clients.reduce((acc, client) => {
                    const clientMaster = clientMasterMap.find(map => map.clientId.equals(client.clientId));
                    if (clientMaster && clientMaster.masterUser) {
                        const percentageAmount = (client.amount * clientMaster.masterUser.percentage) / 100;
                        const finalAmount = client.amount - percentageAmount;
                        return acc + finalAmount;
                    } else {
                        return acc + client.amount; // Add client amount directly if masterUser not found
                    }
                }, 0);

                return {
                    color: bet._id,
                    totalBetAmount: bet.totalBetAmount,
                    totalUsers: bet.totalUsers,
                    totalFinalAmount: totalFinalAmount.toFixed(2), // Format final amount
                    clients: bet.clients.map(client => {
                        const clientMaster = clientMasterMap.find(map => map.clientId.equals(client.clientId));
                        if (clientMaster && clientMaster.masterUser) {
                            const percentageAmount = (client.amount * clientMaster.masterUser.percentage) / 100;
                            const finalAmount = client.amount - percentageAmount;
                            return {
                                clientId: client.clientId,
                                betAmount: client.amount,
                                percentage: clientMaster.masterUser.percentage,
                                finalAmount: finalAmount.toFixed(2) // Format final amount
                            };
                        } else {
                            // Handle case where masterUser is not found
                            return {
                                clientId: client.clientId,
                                betAmount: client.amount,
                                percentage: 0, // or handle appropriately
                                finalAmount: client.amount.toFixed(2) // Directly use client amount as final amount
                            };
                        }
                    })
                };
            });

            // Determine the winner color based on game mode rules
            let winnerColor = null;
            if (game.mode === 'blackWhite') {
                // For 'blackWhite' mode, determine winner based on lowest total bet amount
                let lowestBetAmount = Infinity;
                responseData.forEach(bet => {
                    if (bet.totalBetAmount < lowestBetAmount) {
                        lowestBetAmount = bet.totalBetAmount;
                        winnerColor = bet.color;
                    }
                });
            } else if (game.mode === 'tenColors') {
                // For 'tenColors' mode, specific color array for comparison
                const colorArray = ['Color0', 'Color1', 'Color2', 'Color3', 'Color4', 'Color5', 'Color6', 'Color7', 'Color8', 'Color9'];

                // Find the color with the lowest total bet amount and is in colorArray
                let lowestBetAmount = Infinity;
                colorArray.forEach(color => {
                    const bet = responseData.find(bet => bet.color === color);
                    if (bet && bet.totalBetAmount < lowestBetAmount) {
                        lowestBetAmount = bet.totalBetAmount;
                        winnerColor = color;
                    }
                });
            }

            // If winnerColor is still null, randomly select a winner from available colors
            if (winnerColor === null) {
                const availableColors = responseData.map(bet => bet.color);
                winnerColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            }

            return {
                gameId: game.gameId, // Using game._id as gameId
                mode: game.mode,
                status: game.status,
                startTime: game.startTime,
                endTime: game.endTime,
                countdown: calculateCountdown(game), // Calculate countdown if game is running
                winnerColor: winnerColor, // Add winner color to response
                details: responseData
            };
        };

        // Calculate countdown until game start or end based on current time
        const calculateCountdown = (game) => {
            if (game.status === 'running') {
                const now = new Date();
                const diff = Math.max(0, game.endTime - now);
                return Math.ceil(diff / 1000); // Convert milliseconds to seconds
            } else if (game.status === 'waiting' && game.startTime) {
                const now = new Date();
                const diff = Math.max(0, game.startTime - now);
                return Math.ceil(diff / 1000); // Convert milliseconds to seconds
            }
            return 0;
        };

        // Function to start the game automatically if it's in 'waiting' status and startTime is passed
        const startGamesAutomatically = async () => {
            try {
                const gamesToStart = await Game.find({ status: 'waiting', startTime: { $lte: new Date() } });
                for (const game of gamesToStart) {
                    await game.startGame();
                    console.log(`Started game ${game.gameId} automatically.`);
                }
            } catch (error) {
                console.error('Error starting games automatically:', error);
            }
        };

        // Start all games that are ready to start
        await startGamesAutomatically();

        // Fetch details for both games concurrently
        const [blackWhiteDetails, tenColorsDetails] = await Promise.all([
            fetchBetDetails(blackWhiteGame),
            fetchBetDetails(tenColorsGame)
        ]);

        // Push non-null results into games array
        if (blackWhiteDetails) games.push(blackWhiteDetails);
        if (tenColorsDetails) games.push(tenColorsDetails);

        // Return combined response
        return res.json(games);

    } catch (error) {
        console.error('Error fetching ongoing game details:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getOngoingGameDetails
};
