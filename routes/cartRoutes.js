const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * components:
 *   schemas:
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
 *     CartItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
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
 *           description: The sale price of a single item.
 *           example: "19.99"
 *         qty:
 *           type: integer
 *         attributes:
 *           type: object
 *           additionalProperties: true
 *           description: Product attributes like size or color.
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
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: A short error description.
 *         details:
 *           type: string
 *           description: A more detailed error message.
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Retrieve the user's shopping cart
 *     tags: [Cart]
 *     description: Fetches the contents of the current user's shopping cart.
 *     responses:
 *       200:
 *         description: The user's cart.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart' # This now correctly points to the detailed Cart schema
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', cartController.getCart);

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add or update an item in the cart
 *     tags: [Cart]
 *     description: Adds a new item to the cart or updates the quantity if the item already exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemInput'
 *     responses:
 *       200:
 *         description: The added or updated cart item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Bad Request (e.g., invalid product ID or quantity).
 *       500:
 *         description: Internal Server Error.
 */
router.post('/', cartController.upsertItem);

/**
 * @swagger
 * /cart/{productId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     description: Deletes an item from the shopping cart using its product ID.
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the product to remove.
 *     responses:
 *       200:
 *         description: Confirmation of item removal.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       500:
 *         description: Internal Server Error.
 */
router.delete('/:productId', cartController.removeItem);

/**
 * @swagger
 * /cart/merge:
 *   post:
 *     summary: Merge a guest cart with a user's cart
 *     tags: [Cart]
 *     description: Merges a temporary guest cart into the authenticated user's cart upon login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [guestCartId]
 *               guestCartId:
 *                 type: string
 *                 description: The ID of the guest cart to merge.
 *     responses:
 *       200:
 *         description: The merged and updated cart.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Bad Request (e.g., invalid guest cart ID).
 *       500:
 *         description: Internal Server Error.
 */
router.post('/merge',cartController.mergeCarts);

module.exports = router;