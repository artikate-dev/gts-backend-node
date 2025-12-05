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
 *     CartItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           description: The unique identifier of the product.
 *         quantity:
 *           type: integer
 *           description: The quantity of the product in the cart.
 *           minimum: 1
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The cart ID.
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         totalPrice:
 *           type: number
 *           format: float
 *           description: The total price of all items in the cart.
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
 *               $ref: '#/components/schemas/Cart'
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
 *             $ref: '#/components/schemas/CartItem'
 *     responses:
 *       200:
 *         description: The updated cart.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
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
 *         description: The updated cart after item removal.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
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
 *             properties:
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