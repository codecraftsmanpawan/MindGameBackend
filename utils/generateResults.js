const Bet = require('../models/Bet');
const Client = require('../models/Client');
const MasterUser = require('../models/MasterUser');

const generateResults = async (game) => {
    if (!game) throw new Error('Game not found');

    const fetchBetDetails = async (color) => {
        const betDetails = await Bet.aggregate([
            { $match: { gameId: game._id, color } },
            {
                $group: {
                    _id: null,
                    totalBetAmount: { $sum: '$amount' },
                    clients: { $push: { clientId: '$clientId', amount: '$amount' } }
                }
            }
        ]);

        if (!betDetails.length) return null;

        const { totalBetAmount, clients } = betDetails[0];

        const clientIds = clients.map(client => client.clientId);
        const clientsData = await Client.find({ _id: { $in: clientIds } });
        const masterCodes = clientsData.map(client => client.masterCode);
        const masterUsers = await MasterUser.find({ code: { $in: masterCodes } });

        const clientMasterMap = clientsData.map(client => ({
            clientId: client._id,
            masterCode: client.masterCode,
            masterUser: masterUsers.find(master => master.code === client.masterCode)
        }));

        const totalFinalAmount = clients.reduce((acc, client) => {
            const clientMaster = clientMasterMap.find(map => map.clientId.equals(client.clientId));
            if (clientMaster && clientMaster.masterUser) {
                const percentageAmount = (client.amount * clientMaster.masterUser.percentage) / 100;
                const finalAmount = client.amount - percentageAmount;
                return acc + finalAmount;
            } else {
                return acc + client.amount;
            }
        }, 0);

        return { color, totalBetAmount, totalFinalAmount };
    };

    const getResult = async (resultOptions) => {
        let lowestFinalAmount = Infinity;
        let winnerColor = null;

        for (const color of resultOptions) {
            const betDetails = await fetchBetDetails(color);
            if (!betDetails) {
                return color; // Return the color if there are no bets on it
            }
            if (betDetails.totalFinalAmount < lowestFinalAmount) {
                lowestFinalAmount = betDetails.totalFinalAmount;
                winnerColor = color;
            }
        }

        // Check if bets are placed on all colors and no winner is determined
        const allColorsHaveBets = resultOptions.every(color => {
            return winnerColor !== null || (game.details.some(d => d.color === color && d.totalFinalAmount > 0));
        });

        if (allColorsHaveBets && winnerColor === null) {
            // If bets are on all colors and no winner is found, select the color with the lowest total bet amount
            let lowestBetAmount = Infinity;
            resultOptions.forEach(color => {
                const betDetails = game.details.find(d => d.color === color);
                if (betDetails && betDetails.totalBetAmount < lowestBetAmount) {
                    lowestBetAmount = betDetails.totalBetAmount;
                    winnerColor = color;
                }
            });
        }

        return winnerColor || resultOptions[Math.floor(Math.random() * resultOptions.length)];
    };

    if (game.mode === 'blackWhite') {
        const resultOptions = ['Black', 'White'];
        return await getResult(resultOptions);
    } else if (game.mode === 'tenColors') {
        const resultOptions = ['Color0', 'Color1', 'Color2', 'Color3', 'Color4', 'Color5', 'Color6', 'Color7', 'Color8', 'Color9'];
        return await getResult(resultOptions);
    } else {
        throw new Error('Invalid game mode');
    }
};

module.exports = { generateResults };
