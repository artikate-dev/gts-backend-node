const { validate: isUuid } = require('uuid');

const validateAndAttachIdentity = (req, res, next) => {
    const guestId = req.headers['x-guest-id'] || req.query.guestId || null;
    const userId = req.headers['x-user-id'] || req.query.userId || null;

    if (!guestId && !userId) {
        return res.status(400).json({ 
            error: 'Request requires X-Guest-Id or Authentication.' 
        });
    }

    if (guestId && !isUuid(guestId)) {
        return res.status(400).json({ error: 'Invalid Guest ID format.' });
    }

    if (userId && (!/^\d+$/.test(userId) && !isUuid(userId))) {
        return res.status(400).json({ error: 'Invalid User ID format.' });
    }

    req.identity = { userId, guestId };

    next();
};

module.exports = validateAndAttachIdentity;
