const express = require('express');
const router = express.Router();
const GameController = require('../controllers/gameController');

// Route to get ongoing games
router.get('/ongoing', GameController.getOngoingGames);

// Route to get completed games
router.get('/completed', GameController.getCompletedGames);

// Route to get all games
router.get('/all', GameController.getAllGames);

// Route to create a new game
router.post('/', GameController.createGame);

// Route to update a game by ID
router.put('/:id', GameController.updateGameById);

// Route to delete a game by ID
router.delete('/:id', GameController.deleteGameById);

module.exports = router;
