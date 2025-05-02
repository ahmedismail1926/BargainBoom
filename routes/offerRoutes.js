const express = require("express");
const { check } = require("express-validator");
const offerController = require("../controllers/offerController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post(
  "/",
  auth,
  [
    check("productId", "Product ID is required").not().isEmpty(),
    check(
      "offerPrice",
      "Offer price is required and must be a positive number"
    ).isFloat({ min: 0 }),
    check("quantity", "Quantity must be a positive integer")
      .optional()
      .isInt({ min: 1 }),
  ],
  offerController.createOffer
);

router.get("/product/:productId", auth, offerController.getProductOffers);

router.get("/buyer", auth, offerController.getBuyerOffers);

router.put(
  "/:id",
  auth,
  [
    check("status", "Status is required").isIn([
      "accepted",
      "rejected",
      "countered",
    ]),
    check("counterPrice", "Counter price must be a positive number")
      .optional()
      .isFloat({ min: 0 }),
  ],
  offerController.updateOfferStatus
);

module.exports = router;
