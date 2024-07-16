const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('ws');
const { wss, startGameCycle } = require('./WebSocketServer');
const connectDB = require('./config/db');
const initializeAdmin = require('./config/initAdmin');

dotenv.config();
connectDB(); // Establish MongoDB connection

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies

const PORT = process.env.PORT || 5000;

// Health check route
app.get('/', (req, res) => {
    res.send('Color Prediction Game Server is running');
});

// API Routes
app.use('/admin', require('./routes/adminRoutes'));
app.use('/api/masteruser', require('./routes/masterUserRoutes'));
app.use('/api/client', require('./routes/clientRoutes'));
app.use('/api/games', require('./routes/gamesRouter'));
app.use('/api/bets', require('./routes/betRoutes'));

// Start server and initialize necessary functions
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeAdmin(); // Initialize admin if not already initialized

    // Start game cycles for different modes
    startGameCycle('blackWhite');
    startGameCycle('tenColors');
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

module.exports = app; // Export the app for testing purposes
