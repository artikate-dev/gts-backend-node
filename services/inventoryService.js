exports.checkStock = async (inventoryRedis, variantId) => {
    try {
        const key = `stock:${variantId}`;
        const stockStr = await inventoryRedis.get(key);
        const stock = stockStr !== null ? parseInt(stockStr, 10) : 0;
        return { stock };
    } catch (error) {
        console.error(`[Inventory] Error fetching ${variantId}:`, error.message);
        return { stock: 0 };
    }
};

exports.validateBatchStock = async (inventoryRedis, variantIds) => {
    if (!variantIds || variantIds.length === 0) return {};
    
    const keys = variantIds.map(id => `stock:${id}`);
    try {
        const results = await inventoryRedis.mget(keys);
        const map = {};
        variantIds.forEach((id, index) => {
            map[id] = results[index] !== null ? parseInt(results[index], 10) : 0;
        });
        return map;
    } catch (error) {
        console.error(`[Inventory] Batch error:`, error.message);
        return {};
    }
};