const inventoryService = require('./inventoryService');

class CartService {
    constructor(cartRedis, inventoryRedis, io) {
        this.cartRedis = cartRedis;
        this.inventoryRedis = inventoryRedis;
        this.io = io;
    }

    _getKey(userId, guestId) {
        if (userId) return `cart:user:${userId}`;
        if (guestId) return `cart:guest:${guestId}`;
        throw new Error('Cart requires a User ID or Guest ID');
    }

    _createCartItem(data) {
        return {
            productId: data.productId, 
            sku: data.sku || 'N/A',
            name: data.name,
            slug: data.slug || '',
            image: data.image || '', 
            regular_price: parseFloat(data.regular_price).toFixed(2),
            sale_price: parseFloat(data.sale_price).toFixed(2) || null,
            qty: parseInt(data.qty, 10),
            attributes: data.attributes || {}, 
            updatedAt: new Date().toISOString()
        };
    }

    async joinProductRooms(socketId, cartItems) {
        if (!cartItems || cartItems.length === 0) return;
        const rooms = cartItems.map(item => `product_watch:${item.productId}`);
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.join(rooms);
        }
    }

    async broadcastStockUpdate(productId, newStock) {
        this.io.to(`product_watch:${productId}`).emit('stock_update', {
            productId: productId,
            stock: newStock,
            timestamp: new Date()
        });
        if (newStock < 1) {
             this.io.to(`product_watch:${productId}`).emit('force_cart_refresh', {
                 message: 'An item in your cart just went out of stock.'
             });
        }
    }

    async upsertItem(userId, guestId, productData) {
        const key = this._getKey(userId, guestId);
        const { productId, qty, name } = productData;

        const { stock } = await inventoryService.checkStock(this.inventoryRedis, productId);

        if (stock < qty) {
            throw new Error(`Insufficient stock. Only ${stock} available.`);
        }

        if (stock < 5) {
            this.io.to('admin_notifications').emit('stock_alert', {
                type: 'LOW_STOCK',
                message: `Low stock for ${name} (${productId}): ${stock} remaining.`,
                timestamp: new Date()
            });
        }

        const cartItem = this._createCartItem(productData);
        await this.cartRedis.hset(key, productId, JSON.stringify(cartItem));

        const ttl = userId ? 604800 : 172800;
        await this.cartRedis.expire(key, ttl);

        return cartItem;
    }

    async getCart(userId, guestId) {
        const key = this._getKey(userId, guestId);
        const rawCart = await this.cartRedis.hgetall(key);
        
        if (Object.keys(rawCart).length === 0) {
            return { cart: [], messages: [] };
        }

        const cartItems = [];
        const variantIds = [];
        
        for (const [vId, json] of Object.entries(rawCart)) {
            try {
                const item = JSON.parse(json);
                cartItems.push(item);
                variantIds.push(vId);
            } catch (e) {
                await this.cartRedis.hdel(key, vId);
            }
        }
        const stockMap = await inventoryService.validateBatchStock(this.inventoryRedis, variantIds);
        
        const finalCart = [];
        const messages = [];
        let hasChanges = false;
        const pipeline = this.cartRedis.pipeline();

        for (const item of cartItems) {
            const currentStock = stockMap[item.productId] || 0;

            if (currentStock < 1) {
                pipeline.hdel(key, item.productId);
                messages.push({ type: 'error', text: `${item.name} is now out of stock.` });
                hasChanges = true;
            } else if (item.qty > currentStock) {
                item.qty = currentStock;
                item.message = `Qty adjusted to ${currentStock} (max available).`;
                pipeline.hset(key, item.productId, JSON.stringify(item));
                finalCart.push(item);
                messages.push({ type: 'warning', text: `${item.name} quantity adjusted.` });
                hasChanges = true;
            } else {
                item.max_stock = currentStock;
                finalCart.push(item);
            }
        }

        if (hasChanges) await pipeline.exec();

        return { cart: finalCart, messages };
    }

    async mergeCarts(guestId, userId) {
        if (!guestId || !userId) return;

        const guestKey = this._getKey(null, guestId);
        const userKey = this._getKey(userId, null);
        const [guestRaw, userRaw] = await Promise.all([
            this.cartRedis.hgetall(guestKey),
            this.cartRedis.hgetall(userKey)
        ]);

        if (Object.keys(guestRaw).length === 0) return this.getCart(userId, null);

        const mergedMap = {};
        const allVariantIds = new Set();

        const hydrate = (rawSource) => {
            Object.values(rawSource).forEach(json => {
                try {
                    const item = JSON.parse(json);
                    if (mergedMap[item.productId]) {
                        mergedMap[item.productId].qty += item.qty; 
                    } else {
                        mergedMap[item.productId] = item;
                    }
                    allVariantIds.add(item.productId);
                } catch(e) {}
            });
        };

        hydrate(userRaw);
        hydrate(guestRaw);

        const idsArray = Array.from(allVariantIds);
        const stockMap = await inventoryService.validateBatchStock(this.inventoryRedis, idsArray);
        
        const pipeline = this.cartRedis.pipeline();

        idsArray.forEach(vId => {
            const item = mergedMap[vId];
            const stock = stockMap[vId] || 0;

            if (stock > 0) {
                if (item.qty > stock) item.qty = stock;
                item.updatedAt = new Date().toISOString();
                pipeline.hset(userKey, vId, JSON.stringify(item));
            } else {
                pipeline.hdel(userKey, vId);
            }
        });

        pipeline.del(guestKey);
        pipeline.expire(userKey, 604800); 
        await pipeline.exec();

        this.io.to(`user:${userId}`).emit('cart_updated', { source: 'merge' });

        return this.getCart(userId, null);
    }
    
    async removeItem(userId, guestId, productId) {
        const key = this._getKey(userId, guestId);
        await this.cartRedis.hdel(key, productId);
        return { success: true };
    }
}

module.exports = CartService;