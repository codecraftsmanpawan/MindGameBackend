const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const MasterUser = require('../models/MasterUser');
const Client = require('../models/Client');
const Bet = require('../models/Bet');
const { ObjectId } = require('mongoose').Types;

// Function to add a new master user
const addMasterUser = async (req, res) => {
    const { code, percentage, brokarge, username, password } = req.body;

    try {
        const newMasterUser = new MasterUser({
            code,
            percentage,
            brokarge,
            username,
            password
        });

        await newMasterUser.save();
        res.status(201).send({ message: 'MasterUser created' });
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

// Function to get all master users
const getAllMasterUsers = async (req, res) => {
    try {
        const masterUsers = await MasterUser.find();
        res.json(masterUsers);
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

// Function to get a master user by ID
const getMasterUserById = async (req, res) => {
    try {
        const masterUser = await MasterUser.findById(req.params.id);
        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }
        res.json(masterUser);
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

// Function to update a master user
const updateMasterUser = async (req, res) => {
    try {
        const { code, percentage, brokarge, username, password } = req.body;
        const updatedFields = {
            code,
            percentage,
            brokarge,
            username
        };

        if (password) {
            updatedFields.password = await bcrypt.hash(password, 10); // hash password if provided
        }

        const updatedMasterUser = await MasterUser.findByIdAndUpdate(req.params.id, updatedFields, { new: true });

        if (!updatedMasterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        res.json({ message: 'MasterUser updated', updatedMasterUser });
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

// Function to delete a master user
const deleteMasterUser = async (req, res) => {
    try {
        const deletedMasterUser = await MasterUser.findByIdAndDelete(req.params.id);

        if (!deletedMasterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        res.json({ message: 'MasterUser deleted', deletedMasterUser });
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

// Function to login a master user
const loginMasterUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const masterUser = await MasterUser.findOne({ username });

        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        const isMatch = await bcrypt.compare(password, masterUser.password);

        if (!isMatch) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: masterUser._id, username: masterUser.username }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

// Function to get profile of MasterUser by username
const getMasterUserProfile = async (req, res) => {
    const { username } = req.params;

    try {
        const masterUser = await MasterUser.findOne({ username });

        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        res.json(masterUser);
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};



// Function to get clients by masterCode including total bet amount and brokarge calculation
const getClientsByMasterCode = async (req, res) => {
    try {
        const { code } = req.params;

        // Find masterUser by code
        const masterUser = await MasterUser.findOne({ code });
        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        // Calculate the start and end dates for the current week (assuming week starts on Monday)
        const currentDate = new Date();
        const firstDayOfWeek = new Date(currentDate.setDate(currentDate.getDate() - (currentDate.getDay() + 6) % 7));
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

        // Format the dates for display
        const formatDate = (date) => {
            const d = new Date(date);
            const month = ('0' + (d.getMonth() + 1)).slice(-2);
            const day = ('0' + d.getDate()).slice(-2);
            const year = d.getFullYear();
            return `${year}-${month}-${day}`;
        };

        const formattedFirstDayOfWeek = formatDate(firstDayOfWeek);
        const formattedLastDayOfWeek = formatDate(lastDayOfWeek);

        // Aggregate clients and their total bet amount, win amount, loss amount, win count, loss count, and total bet count
        const clientsWithTotalBet = await Client.aggregate([
            {
                $match: {
                    masterCode: code
                }
            },
            {
                $lookup: {
                    from: 'bets', // Collection name of the Bet model
                    localField: '_id',
                    foreignField: 'clientId',
                    as: 'bets'
                }
            },
            {
                $unwind: {
                    path: '$bets',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    'bets.timestamp': {
                        $gte: firstDayOfWeek,
                        $lt: lastDayOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: '$_id',
                    code: { $first: '$code' },
                    budget: { $first: '$budget' },
                    status: { $first: '$status' },
                    username: { $first: '$username' },
                    createDate: { $first: '$createDate' },
                    updateDate: { $first: '$updateDate' },
                    totalBetAmount: { $sum: '$bets.amount' },
                    totalWinAmount: {
                        $sum: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$bets.result', 'win'] }, then: { $multiply: ['$bets.amount', { $cond: [{ $eq: ['$bets.gameMode', 'blackWhite'] }, 1.9, { $cond: [{ $eq: ['$bets.gameMode', 'tenColor'] }, 9, 1] }] }] } }
                                ],
                                default: 0
                            }
                        }
                    },
                    totalLossAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$bets.result', 'loss'] }, '$bets.amount', 0]
                        }
                    },
                    totalWinCount: {
                        $sum: {
                            $cond: [{ $eq: ['$bets.result', 'win'] }, 1, 0]
                        }
                    },
                    totalLossCount: {
                        $sum: {
                            $cond: [{ $eq: ['$bets.result', 'loss'] }, 1, 0]
                        }
                    },
                    totalBetCount: { $sum: 1 } // Add total bet count
                }
            }
        ]);

        // Calculate brokarge percentage on total bet amount
        clientsWithTotalBet.forEach(client => {
            client.brokargeAmount = (client.totalBetAmount * masterUser.brokarge) / 100;
        });

        // Add date range to the response
        const response = {
            firstDayOfWeek: formattedFirstDayOfWeek,
            lastDayOfWeek: formattedLastDayOfWeek,
            clients: clientsWithTotalBet
        };

        res.json(response);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving clients with total bet amount and brokarge calculation', error: error.message });
    }
};






// Function to get total bet amount by masterCode
const getTotalBetAmountByMasterCode = async (req, res) => {
    try {
        const { code } = req.params;

        const masterUser = await MasterUser.findOne({ code });

        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        const totalBetAmounts = await Bet.aggregate([
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'client'
                }
            },
            {
                $match: {
                    'client.masterCode': code
                }
            },
            {
                $group: {
                    _id: '$clientId',
                    totalBetAmount: { $sum: '$amount' }
                }
            }
        ]);

        const totalBetAmount = totalBetAmounts.reduce((total, bet) => total + bet.totalBetAmount, 0);

        res.json({ totalBetAmount });
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving total bet amount', error: error.message });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Ensure you're getting the user ID from the authenticated token

    try {
        const masterUser = await MasterUser.findById(userId);

        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, masterUser.password);
        
        if (!isMatch) {
            return res.status(401).send({ message: 'Current password is incorrect' });
        }

        // Hash the new password
        masterUser.password = newPassword; // Set the new password
        await masterUser.save(); // Save to apply the pre-save hook for hashing

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Server error', error: error.message });
    }
};

const getWeeklyDataByCode = async (req, res) => {
    try {
        const { code } = req.params;

        // Find masterUser by code
        const masterUser = await MasterUser.findOne({ code });
        if (!masterUser) {
            return res.status(404).send({ message: 'MasterUser not found' });
        }

        // Calculate the start and end dates for the current week (assuming week starts on Sunday)
        const currentDate = new Date();
        const firstDayOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

        // Aggregate bet data within the date range
        const bets = await Bet.aggregate([
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'client'
                }
            },
            {
                $match: {
                    'client.masterCode': code,
                    timestamp: {
                        $gte: firstDayOfWeek,
                        $lt: lastDayOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalWin: {
                        $sum: {
                            $cond: [{ $eq: ['$result', 'win'] }, '$amount', 0]
                        }
                    },
                    totalLoss: {
                        $sum: {
                            $cond: [{ $eq: ['$result', 'loss'] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const weeklyData = bets[0] || { totalWin: 0, totalLoss: 0 };

        res.json({ weeklyData });
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving weekly data', error: error.message });
    }
};


module.exports = {
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
};
