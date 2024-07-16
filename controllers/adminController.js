const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Client = require('../models/Client'); // Import the Client model

// Existing admin login function
const adminLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ token });
        } else {
            return res.status(401).send({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        return res.status(500).send({ message: 'Server error' });
    }
};

// Function to get current budget by client ID
const getClientBudget = async (req, res) => {
    const { id } = req.params; // Client ID from the URL

    try {
        const client = await Client.findById(id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }

        return res.json({ budget: client.budget });
    } catch (error) {
        console.error('Error fetching client budget:', error);
        return res.status(500).send({ message: 'Server error' });
    }
};

// Function to update client budget by client ID
const updateClientBudget = async (req, res) => {
    const { id } = req.params; // Client ID from the URL
    const { budget } = req.body; // New budget from the request body

    // Validate the budget
    if (typeof budget !== 'number' || budget < 0) {
        return res.status(400).send({ message: 'Invalid budget amount' });
    }

    try {
        const client = await Client.findById(id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }

        client.budget = budget; // Update the budget
        await client.save(); // Save the changes

        return res.json({ message: 'Budget updated successfully', budget: client.budget });
    } catch (error) {
        console.error('Error updating client budget:', error);
        return res.status(500).send({ message: 'Server error' });
    }
};

module.exports = { adminLogin, getClientBudget, updateClientBudget };
