const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to join a game and place a bet (requires authentication)
router.post('/join-game', authMiddleware, betController.joinGame);

// Route to fetch all bets for a specific client (requires authentication)
router.get('/client-bets/:clientId', authMiddleware, betController.getClientBets);

// Route to fetch current bets (games in "running" state) for a specific client (requires authentication)
router.get('/client-bets/:clientId/current', authMiddleware, betController.getCurrentBets);

module.exports = router;
