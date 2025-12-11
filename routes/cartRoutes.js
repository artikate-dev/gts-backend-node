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
 * /cart:
 *   get:
 *     summary: Retrieve the user's shopping cart
 *     tags: [Cart]
 *     description: Fetches the contents of the current user's shopping cart. You can pass either a userId (for logged-in users) or a guestId (for anonymous/guest carts). If both are provided, userId typically takes precedence.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: The authenticated user's ID. When provided, returns the cart for this user.
 *       - in: query
 *         name: guestId
 *         schema:
 *           type: string
 *         required: false
 *         description: The guest identifier (for anonymous carts). Used when no userId is present.
 *     responses:
 *       200:
 *         description: The user's cart.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Bad Request (invalid IDs)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: The authenticated user's ID. When provided, returns the cart for this user.
 *       - in: query
 *         name: guestId
 *         schema:
 *           type: string
 *         required: false
 *         description: The guest identifier (for anonymous carts). Used when no userId is present.
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
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: The authenticated user's ID. When provided, returns the cart for this user.
 *       - in: query
 *         name: guestId
 *         schema:
 *           type: string
 *         required: false
 *         description: The guest identifier (for anonymous carts). Used when no userId is present.
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

module.exports = router;