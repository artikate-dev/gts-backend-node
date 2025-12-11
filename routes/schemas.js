/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: The unique identifier of the product variant.
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         image:
 *           type: string
 *           format: uri
 *         regular_price:
 *           type: string
 *           description: The regular price of a single item.
 *           example: "19.99"
 *         sale_price:
 *           type: string
 *           nullable: true
 *           description: The sale price of a single item.
 *           example: "17.99"
 *         discount:
 *           type: number
 *           description: The discount applied to the item.
 *         is_digital:
 *           type: boolean
 *           description: Indicates if the product is a digital item.
 *         qty:
 *           type: integer
 *         attributes:
 *           type: object
 *           additionalProperties: true
 *           description: Product attributes like size or color.
 *         addedAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         message:
 *           type: string
 *           description: A message related to the item, e.g., if quantity was adjusted.
 *         max_stock:
 *           type: integer
 *           description: The maximum available stock for this item.
 *     Cart:
 *       type: object
 *       properties:
 *         cart:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         messages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [error, warning, info]
 *               text:
 *                 type: string
 *     CartItemInput: 
 *       type: object
 *       required:
 *         - productId
 *         - qty
 *       properties:
 *         productId:
 *           type: string
 *           description: The unique identifier of the product.
 *         qty:
 *           type: integer
 *           description: The quantity of the product in the cart.
 *           minimum: 1
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: A short error description.
 */