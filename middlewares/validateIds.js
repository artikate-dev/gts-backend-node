const { validate: isUuid } = require('uuid');

const validateIdentifiers = (req, res, next) => {
    const guestId = req.headers['x-guest-id'] || req.query.guestId;
    const userId = req.headers['x-user-id'] || req.query.userId; 

    if (!guestId && !userId) {
        return res.status(400).json({ 
            error: 'Request requires X-Guest-Id or Authentication.' 
        });
    }

    if (guestId) {
        if (!isUuid(guestId)) {
            return res.status(400).json({ 
                error: 'Invalid Guest ID format. Must be UUID v4.' 
            });
        }
    }

    if (userId) {
        if (!/^\d+$/.test(userId) && !isUuid(userId)) {
             return res.status(400).json({ 
                error: 'Invalid User ID format.' 
            });
        }
    }

    next();
};

module.exports = validateIdentifiers;