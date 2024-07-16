const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const initializeAdmin = async () => {
    try {
        const admin = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
        if (!admin) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            const newAdmin = new Admin({
                username: process.env.ADMIN_USERNAME,
                password: hashedPassword,
            });
            await newAdmin.save();
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Error initializing admin user:', error);
    }
};

module.exports = initializeAdmin;
