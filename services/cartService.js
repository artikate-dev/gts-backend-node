const inventoryService = require('./inventoryService');

class CartService {
    constructor(cartRedis, inventoryRedis, io) {
        this.redis = cartRedis;
        this.inventoryRedis = inventoryRedis;
        this.io = io;
    }

    _getKey(userId, guestId) {
        if (userId) return `cart:user:${userId}`;
        if (guestId) return `cart:guest:${guestId}`;
        throw new Error('No identifier provided for Cart');
    }

    async mergeCarts(guestId, userId) {
        if (!guestId || !userId) return;

        const guestKey = this._getKey(null, guestId);
        const userKey = this._getKey(userId, null);

        const rawGuestCart = await this.redis.hgetall(guestKey);
        if (Object.keys(rawGuestCart).length === 0) return;

        const rawUserCart = await this.redis.hgetall(userKey);

        const mergedItems = {};
        const productIdsToCheck = new Set();

        const parseCart = (raw) => {
            Object.values(raw).forEach(json => {
                try {
                    const item = JSON.parse(json);
                    if (mergedItems[item.productId]) {
                        mergedItems[item.productId].qty += item.qty;
                    } else {
                        mergedItems[item.productId] = item;
                    }
                    productIdsToCheck.add(item.productId);
                } catch (e) {}
            });
        };

        parseCart(rawUserCart);
        parseCart(rawGuestCart);

        const idsArray = Array.from(productIdsToCheck);
        const stockMap = await inventoryService.validateBatchStock(this.inventoryRedis, idsArray);

        const pipeline = this.redis.pipeline();

        for (const productId of idsArray) {
            const item = mergedItems[productId];
            const realTimeStock = stockMap[productId] || 0;

            if (realTimeStock < 1) {
                pipeline.hdel(userKey, productId);
            } else {
                if (item.qty > realTimeStock) {
                    item.qty = realTimeStock;
                    item.message = `Quantity adjusted to stock limits during merge.`;
                }
                item.updatedAt = new Date();
                pipeline.hset(userKey, productId, JSON.stringify(item));
            }
        }

        pipeline.expire(userKey, 86400); 
        pipeline.del(guestKey);
        
        await pipeline.exec();

        return this.getCart(userId, null); 
    }

    async getCart(userId, guestId) {
        const key = this._getKey(userId, guestId);
        const rawCart = await this.redis.hgetall(key);

        const cartItems = [];
        const productIds = [];

        for (const [productId, data] of Object.entries(rawCart)) {
            try {
                const item = JSON.parse(data);
                cartItems.push(item);
                productIds.push(productId);
            } catch (e) {
                console.error(`Corrupt data for ${productId}`, e);
            }
        }

        if (cartItems.length === 0) {
            return { cart: [], removedItems: [] };
        }

        const stockMap = await inventoryService.validateBatchStock(this.inventoryRedis, productIds);
        
        const finalCart = [];
        const outOfStockItems = [];
        let needsUpdate = false;

        for (const item of cartItems) {
            const realTimeStock = stockMap[item.productId];

            if (realTimeStock < 1) {
                await this.redis.hdel(key, item.productId);
                outOfStockItems.push(item.name);
                if (userId) {
                    this.io.to('admin_notifications').emit('stock_alert', {
                        type: 'AUTO_REMOVAL',
                        message: `Item '${item.name}' removed from User ${userId}'s cart (Stock: 0).`,
                        productId: item.productId,
                        userId: userId,
                        timestamp: new Date()
                    });
                }
            } 
            else if (item.qty > realTimeStock) {
                item.qty = realTimeStock;
                item.stockAvailable = realTimeStock;
                item.message = `Quantity reduced to ${realTimeStock} (Max available)`;

                await this.redis.hset(key, item.productId, JSON.stringify(item));
                
                finalCart.push(item);
            } 
            else {
                item.stockAvailable = realTimeStock;
                finalCart.push(item);
            }
        }

        return { 
            cart: finalCart, 
            removedItems: outOfStockItems 
        };
    }

    async upsertItem(userId, guestId, productData) {
        const { productId, qty, name, price } = productData;
        const key = this._getKey(userId, guestId);

        const { stock } = await inventoryService.checkStock(this.inventoryRedis, productId);

        if (stock < qty) {
            throw new Error(`Insufficient stock for ${name}. Available: ${stock}`);
        }

        if (stock < 5) {
            this.io.to('admin_notifications').emit('stock_alert', {
                type: 'LOW_STOCK',
                message: `Product '${name}' (${productId}) is running low! Only ${stock} left.`,
                productId: productId,
                timestamp: new Date()
            });
        }

        const cartItem = { 
            productId, 
            qty, 
            name, 
            price, 
            updatedAt: new Date() 
        };

        await this.redis.hset(key, productId, JSON.stringify(cartItem));

        const ttl = userId ? 604800 : 172800; 
        await this.redis.expire(key, ttl);
        
        return cartItem;
    }

    async removeItem(userId, guestId, productId) {
        const key = this._getKey(userId, guestId);
        await this.redis.hdel(key, productId);
        return { message: 'Item removed' };
    }
}

module.exports = CartService;