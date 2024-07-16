const { Server } = require('ws');
const Game = require('./models/Game');
const Bet = require('./models/Bet');
const Client = require('./models/Client');
const { generateResults } = require('./utils/generateResults'); // Import generateResults from utils

const wss = new Server({ noServer: true });

wss.on('connection', async (socket) => {
    console.log('WebSocket client connected');

    socket.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'AUTH':
                    await handleAuthentication(socket, data);
                    break;
                case 'BET':
                    await handleBet(socket, data);
                    break;
                default:
                    socket.send(JSON.stringify({ type: 'ERROR', message: 'Unknown message type' }));
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
        }
    });

    socket.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

const handleAuthentication = async (socket, data) => {
    const { username, password } = data;
    try {
        const client = await Client.findOne({ username });
        if (client && await bcrypt.compare(password, client.password)) {
            socket.clientId = client._id;
            socket.send(JSON.stringify({ type: 'AUTH_SUCCESS', client }));
        } else {
            socket.send(JSON.stringify({ type: 'AUTH_FAILED', message: 'Invalid credentials' }));
        }
    } catch (error) {
        console.error('Error during authentication:', error);
        socket.send(JSON.stringify({ type: 'AUTH_FAILED', message: 'Authentication error' }));
    }
};

const handleBet = async (socket, data) => {
    const { gameId, amount, color, gameMode } = data;
    const clientId = socket.clientId;

    try {
        const game = await Game.findById(gameId);
        const client = await Client.findById(clientId);

        if (!game || !client || game.status !== 'running') {
            socket.send(JSON.stringify({ type: 'BET_FAILED', message: 'Game is not currently running or invalid credentials' }));
            return;
        }

        if (client.budget < amount) {
            socket.send(JSON.stringify({ type: 'BET_FAILED', message: 'Insufficient funds' }));
            return;
        }

        client.budget -= amount; // Deduct bet amount immediately
        await client.save();

        let winningAmount = 0;
        if (gameMode === 'blackWhite' && (game.results === color)) {
            winningAmount = amount * 1.9;
        } else if (gameMode === 'tenColors' && game.results === color) {
            winningAmount = amount * 9;
        }

        const bet = new Bet({ gameId, clientId, amount, color, gameMode, winningAmount });
        await bet.save();

        if (winningAmount > 0) {
            client.budget += winningAmount;
            await client.save();
            socket.send(JSON.stringify({ type: 'BET_WON', message: `Congratulations! You won ${winningAmount} credits.` }));
        }

        socket.send(JSON.stringify({ type: 'BET_PLACED', bet }));

        broadcastGameState(gameId);
    } catch (error) {
        console.error('Error handling bet:', error);
        socket.send(JSON.stringify({ type: 'BET_FAILED', message: 'Error placing bet' }));
    }
};

const broadcastGameState = async (gameId) => {
    try {
        const game = await Game.findById(gameId);
        if (!game) return;

        const gameState = {
            type: 'GAME_STATE',
            game,
        };

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(gameState));
            }
        });
    } catch (error) {
        console.error('Error broadcasting game state:', error);
    }
};

const startGameCycle = async (mode) => {
    const gameDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    let delay = 0; // Delay for starting the game

    if (mode === 'tenColors') {
        delay = 10 * 60 * 1000; // 10 minutes in milliseconds
    }

    setTimeout(async () => {
        const newGame = new Game({ mode, status: 'running' });
        await newGame.save();
    
        wss.emit('gameStarted', { gameId: newGame._id, mode });
    
        setTimeout(() => {
            endGameCycle(newGame._id);
        }, gameDuration);
        
        // Automatically start the next game cycle for tenColors after 30 seconds
        if (mode === 'tenColors') {
            setTimeout(() => {
                startGameCycle(mode);
            }, 30 * 1000); // 30 seconds in milliseconds
        }
    }, delay);
};


const endGameCycle = async (gameId) => {
    const game = await Game.findById(gameId);
    if (!game) {
        console.error('Game not found');
        return;
    }

    const results = await generateResults(game);

    const updatedGame = await Game.findByIdAndUpdate(gameId, {
        status: 'completed',
        endTime: Date.now(),
        results,
    }, { new: true });

    const bets = await Bet.find({ gameId });
    for (const bet of bets) {
        if (bet.color === results) {
            const winningAmount = bet.amount * (game.mode === 'blackWhite' ? 1.9 : 9);
            bet.winningAmount = winningAmount;
            bet.result = 'win';
            const client = await Client.findById(bet.clientId);
            client.budget += winningAmount;
            await client.save();
        } else {
            bet.result = 'loss';
        }
        await bet.save();
    }

    wss.emit('gameEnded', updatedGame);

    setTimeout(() => {
        startGameCycle(updatedGame.mode);
    }, 20 * 1000);
};

module.exports = { wss, startGameCycle, handleBet };
