const express = require('express');
const { check } = require('express-validator');
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new order (direct purchase)
router.post(
  '/',
  auth,
  [
    check('productId', 'Product ID is required').not().isEmpty(),
    check('quantity', 'Quantity is required and must be a positive integer').isInt({ min: 1 })
  ],
  orderController.createOrder
);

// Create an order from accepted offer
router.post(
  '/from-offer',
  auth,
  [
    check('offerId', 'Offer ID is required').not().isEmpty()
  ],
  orderController.createOrderFromOffer
);

// Get buyer's orders
router.get('/buyer', auth, orderController.getBuyerOrders);

// Get seller's orders
router.get('/seller', auth, orderController.getSellerOrders);

// Get order by ID
router.get('/:id', auth, orderController.getOrderById);

// Update order status
router.put(
  '/:id',
  auth,
  [
    check('status', 'Status is required and must be valid').isIn(['shipped', 'completed', 'cancelled'])
  ],
  orderController.updateOrderStatus
);

module.exports = router;
