const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// Route to get ongoing games
router.get('/ongoing', async (req, res) => {
    try {
        const ongoingGames = await Game.find({ status: 'running' });
        res.status(200).json({
            success: true,
            count: ongoingGames.length,
            data: ongoingGames
        });
    } catch (err) {
        console.error('Error fetching ongoing games:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to get completed games
router.get('/completed', async (req, res) => {
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
});

// Route to get all games
router.get('/all', async (req, res) => {
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
});

module.exports = router;
