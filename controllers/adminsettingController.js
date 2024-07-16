// In your admin settings controller (adminsettingController.js)
const AdminSettings = require('../models/AdminSettings'); // Adjust the path as needed

exports.updateAdminSettings = async (req, res) => {
    try {
        const { resultMode, manualResultBlackWhite, manualResultTenColors } = req.body;

        let adminSettings = await AdminSettings.findOne({});
        if (!adminSettings) {
            adminSettings = new AdminSettings();
        }

        adminSettings.resultMode = resultMode;
        adminSettings.manualResultBlackWhite = manualResultBlackWhite;
        adminSettings.manualResultTenColors = manualResultTenColors;

        await adminSettings.save();

        res.status(200).json({ message: 'Admin settings updated successfully', adminSettings });
    } catch (error) {
        res.status(500).json({ message: 'Error updating admin settings', error });
    }
};
