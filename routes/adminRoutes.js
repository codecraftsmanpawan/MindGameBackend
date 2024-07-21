const express = require('express');
const router = express.Router();
const { adminLogin, updateClientBudget, getClientBudget } = require('../controllers/adminController');
const { getOngoingGameDetails } = require('../controllers/adminGameController');
const { getLastGameResultsByMode } = require('../controllers/lastGameResultsController');
const authMiddleware = require('../middleware/authMiddleware');

// Admin login route
router.post('/login', adminLogin);

// Ongoing game details route (protected by authMiddleware)
router.get('/ongoing-game-details', authMiddleware, getOngoingGameDetails);

// Route to fetch last game results by mode (protected by authMiddleware)
router.get('/last-game-results',  getLastGameResultsByMode);

// Route to update client budget (protected by authMiddleware)
router.put('/update-budget/:id', authMiddleware, updateClientBudget);

// Route to get client budget by ID (protected by authMiddleware)
router.get('/client-budget/:id', authMiddleware, getClientBudget);

module.exports = router;
