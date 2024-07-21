const express = require('express');
const router = express.Router();
const GameController = require('../controllers/gameController');
const adminAuth = require('../middleware/authMiddleware');

// Route to get ongoing games
router.get('/ongoing', GameController.getOngoingGames);

// Route to get completed games
router.get('/completed', GameController.getCompletedGames);

// Route to get all games
router.get('/all', GameController.getAllGames);

// Route to get a game by ID
router.get('/:id', GameController.getGameById);

// Route to create a new game (admin only)
router.post('/', adminAuth, GameController.createGame);

// Route to update a game by ID (admin only)
router.put('/:id', adminAuth, GameController.updateGameById);

// Route to delete a game by ID (admin only)
router.delete('/:id', adminAuth, GameController.deleteGameById);

// Route to declare results for a game (admin only)
router.post('/:id/declareResults', adminAuth, GameController.declareResults);

// Route to add results for blackWhite games before the end of the 30-second timer (admin only)
router.post('/:id/blackWhiteResultsBeforeEnd', adminAuth, GameController.addBlackWhiteResultsBeforeEnd);

// Route to add results for tenColors games before the end of the 30-second timer (admin only)
router.post('/:id/tenColorsResultsBeforeEnd', adminAuth, GameController.addTenColorsResultsBeforeEnd);

module.exports = router;
