const express = require('express');
const {
    addMasterUser,
    getAllMasterUsers,
    getMasterUserById,
    updateMasterUser,
    deleteMasterUser,
    loginMasterUser,
    getMasterUserProfile,
    getClientsByMasterCode,
    getTotalBetAmountByMasterCode,
    changePassword,
    getWeeklyDataByCode
} = require('../controllers/masterUserController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/add', authMiddleware, addMasterUser);
router.get('/', authMiddleware, getAllMasterUsers);
router.get('/:id', authMiddleware, getMasterUserById);
router.put('/:id', authMiddleware, updateMasterUser);
router.delete('/:id', authMiddleware, deleteMasterUser); 
router.post('/login', loginMasterUser);
router.get('/profile/:username', authMiddleware, getMasterUserProfile);
router.get('/clients/:code', authMiddleware, getClientsByMasterCode);
router.get('/total-bet/:code', authMiddleware, getTotalBetAmountByMasterCode);
router.post('/change-password', authMiddleware, changePassword); 
router.get('/weekly-data/:code', getWeeklyDataByCode);
module.exports = router;
