const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Client = require('../models/Client');
const Game = require('../models/Game');

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send({ message: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Invalid token.' });
        req.client = decoded;
        next();
    });
};

const addClient = async (req, res) => {
    const { code, budget, masterCode, status, username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newClient = new Client({
            code,
            budget,
            masterCode,
            status,
            username,
            password: hashedPassword,
        });

        await newClient.save();
        res.status(201).send({ message: 'Client created' });
    } catch (error) {
        console.error('Error adding client:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const getAllClients = async (req, res) => {
    try {
        const clients = await Client.find();
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        console.error('Error fetching client by ID:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const updateClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }

        const { code, budget, masterCode, status, username, password } = req.body;
        client.code = code || client.code;
        client.budget = budget || client.budget;
        client.masterCode = masterCode || client.masterCode;
        client.status = status || client.status;
        client.username = username || client.username;
        if (password) {
            client.password = await bcrypt.hash(password, 10);
        }
        client.updateDate = Date.now();

        await client.save();
        res.json({ message: 'Client updated' });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const deleteClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }
        await client.remove();
        res.json({ message: 'Client deleted' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const loginClient = async (req, res) => {
    const { username, password } = req.body;

    try {
        const client = await Client.findOne({ username });
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }

        const isMatch = await bcrypt.compare(password, client.password);
        if (!isMatch) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: client._id, username: client.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    } catch (error) {
        console.error('Error logging in client:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const changePassword = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    try {
        const client = await Client.findOne({ username });
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, client.password);
        if (!isMatch) {
            return res.status(401).send({ message: 'Old password is incorrect' });
        }

        client.password = await bcrypt.hash(newPassword, 10);
        await client.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).send({ message: 'Server error' });
    }
};


const getCurrentClient = async (req, res) => {
    try {
        const client = await Client.findById(req.client.id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        console.error('Error fetching current client:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

const recordGameResult = async (req, res) => {
    const { gameId, result, amount } = req.body;

    try {
        const client = await Client.findById(req.client.id);
        if (!client) {
            return res.status(404).send({ message: 'Client not found' });
        }

        // Check if result is valid ('win' or 'loss')
        if (!['win', 'loss'].includes(result)) {
            return res.status(400).send({ message: 'Invalid game result' });
        }

        // Update client's budget based on game result
        if (result === 'win') {
            client.budget += amount;
        } else if (result === 'loss') {
            client.budget -= amount;
        }

        // Add game result to client's gameResults
        client.gameResults.push({ gameId, result });

        // Add amount history
        client.amountHistory.push({ amount, gameId, result });

        await client.save();

        res.json({ message: 'Game result recorded successfully', budget: client.budget });
    } catch (error) {
        console.error('Error recording game result:', error);
        res.status(500).send({ message: 'Server error' });
    }
};

module.exports = {
    addClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient,
    loginClient,
    changePassword,
    getCurrentClient,
    authenticateToken,
    recordGameResult
};
