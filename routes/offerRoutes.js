const express = require('express');
const { check } = require('express-validator');
const offerController = require('../controllers/offerController');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new counter offer
router.post(
  '/',
  auth,
  [
    check('productId', 'Product ID is required').not().isEmpty(),
    check('offerPrice', 'Offer price is required and must be a positive number').isFloat({ min: 0 })
  ],
  offerController.createOffer
);

// Get offers for a product (seller only)
router.get('/product/:productId', auth, offerController.getProductOffers);

// Get buyer's offers
router.get('/buyer', auth, offerController.getBuyerOffers);

// Update offer status (accept, reject, counter)
router.put(
  '/:id',
  auth,
  [
    check('status', 'Status is required').isIn(['accepted', 'rejected', 'countered']),
    check('counterPrice', 'Counter price must be a positive number').optional().isFloat({ min: 0 })
  ],
  offerController.updateOfferStatus
);

module.exports = router;
