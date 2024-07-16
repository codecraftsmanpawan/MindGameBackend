const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).send({ message: 'No token provided' });
    }

    try {
        const trimmedToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(trimmedToken, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).send({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;
