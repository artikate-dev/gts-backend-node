class CartItem {
  constructor(data) {
    if (!data.productId) {
      throw new Error('CartItem requires a productId');
    }
    this.productId = data.productId;
    this.sku = data.sku || 'N/A';
    this.name = data.name;
    this.slug = data.slug || '';
    this.image = data.image || '';
    
    this.regular_price = this.formatPrice(data.regular_price);
    this.sale_price = data.sale_price ? this.formatPrice(data.sale_price) : null;
    this.discount = data.discount || 0;
    
    this.is_digital = !!data.is_digital; 
    this.qty = parseInt(data.qty, 10) || 1;
    this.attributes = data.attributes || {};
    
    const now = new Date().toISOString();
    this.addedAt = data.addedAt || now;
    this.updatedAt = now; 
  }

  formatPrice(price) {
    const num = parseFloat(price);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  }

}