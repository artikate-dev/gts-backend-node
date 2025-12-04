exports.checkStock = async (inventoryRedis, productId) => {
    try {
        const key = `product:stock:${productId}`;
        const stockStr = await inventoryRedis.get(key);
        const stock = stockStr !== null ? parseInt(stockStr, 10) : 0;
        return { stock };
    } catch (error) {
        console.error(`[InventoryService] Error for ${productId}:`, error.message);
        return { stock: 0 };
    }
};

exports.validateBatchStock = async (inventoryRedis, productIds) => {
    try {
        if (!productIds || productIds.length === 0) return {};
        const keys = productIds.map(id => `product:stock:${id}`);
        const stockValues = await inventoryRedis.mget(keys);
        const stockMap = {};
        productIds.forEach((id, index) => {
            const val = stockValues[index];
            stockMap[id] = val !== null ? parseInt(val, 10) : 0;
        });
        return stockMap;
    } catch (error) {
        console.error('[InventoryService] Batch Error:', error.message);
        return {};
    }
};