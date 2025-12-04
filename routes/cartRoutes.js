const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/', cartController.getCart);
router.post('/', cartController.upsertItem);
router.delete('/:productId', cartController.removeItem);
router.post('/merge',cartController.mergeCarts);

module.exports = router;