const CartService = require('../services/cartService');

const getIdentifiers = (req) => {
  const userId = (req.user ? req.user.id : req.params.userId) || null;
  const guestId = req.headers['x-guest-id'] || req.body.guestId || req.params.guestId || null;
  return { userId, guestId };
};

exports.getCart = async (req, res, next) => {
  try {
    const { userId, guestId } = getIdentifiers(req);
    const cartService = new CartService(req.redis, req.inventoryRedis, req.io);
    const cartData = await cartService.getCart(userId, guestId);
    res.status(200).json(cartData);
  } catch (error) {
    next(error);
  }
};

exports.upsertItem = async (req, res, next) => {
  try {
    const { userId, guestId } = getIdentifiers(req);
    const productData = req.body; 
    if (!productData.productId || !productData.qty) {
      return res.status(400).json({ error: 'productId and qty are required.' });
    }
    const cartService = new CartService(req.redis, req.inventoryRedis, req.io);
    const updatedItem = await cartService.upsertItem(userId, guestId, productData);
    res.status(200).json(updatedItem);
  } catch (error) {
    if (error.message.includes('Insufficient stock')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    const { userId, guestId } = getIdentifiers(req);
    const { productId } = req.params;
    const cartService = new CartService(req.redis, req.inventoryRedis, req.io);
    const result = await cartService.removeItem(userId, guestId, productId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.mergeCarts = async (req, res, next) => {
  try {
    const { userId, guestId } = getIdentifiers(req);
    if (!userId || !guestId) {
      return res.status(400).json({ error: 'userId and guestId are required for merge.' });
    }
    const cartService = new CartService(req.redis, req.inventoryRedis, req.io);
    const mergedCart = await cartService.mergeCarts(guestId, userId);
    res.status(200).json(mergedCart);
  } catch (error) {
    next(error);
  }
};