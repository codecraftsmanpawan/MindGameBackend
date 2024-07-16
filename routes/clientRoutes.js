const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/client/add - Add a new client (requires authentication)
router.post('/add', authMiddleware, clientController.addClient);

// GET /api/client/ - Get all clients (requires authentication)
router.get('/', authMiddleware, clientController.getAllClients);

// GET /api/client/:id - Get client by ID (requires authentication)
router.get('/:id', authMiddleware, clientController.getClientById);

// // PUT /api/client/:id - Update client by ID (requires authentication)
// router.put('/:id', authMiddleware, clientController.updateClient);

// // DELETE /api/client/:id - Delete client by ID (requires authentication)
// router.delete('/:id', authMiddleware, clientController.deleteClient);

// POST /api/client/login - Login client (public)
router.post('/login', clientController.loginClient);

// POST /api/client/change-password - Change client's password (requires authentication)
router.post('/change-password', authMiddleware, clientController.changePassword);

// GET /api/client/me - Get current client's details (requires authentication)
router.get('/me', authMiddleware, clientController.getCurrentClient);

module.exports = router;
