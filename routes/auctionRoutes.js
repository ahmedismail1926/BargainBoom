const express = require("express");
const { check } = require("express-validator");
const auctionController = require("../controllers/auctionController");
const auth = require("../middleware/auth");

const router = express.Router();

// Get the maximum bid for a product
router.get("/max-bid/:productId", auctionController.getMaxBid);

// Get all bids for a product
router.get("/product/:productId", auctionController.getBidsByProduct);

// Get all bids made by the authenticated buyer
router.get("/my-bids", auth, auctionController.getBidsByBuyer);

// Create a new bid
router.post(
  "/",
  auth,
  [
    check("productId", "Product ID is required").not().isEmpty(),
    check("bidAmount", "Bid amount must be a positive number").isFloat({
      min: 0.01,
    }),
  ],
  auctionController.createBid
);

// Get auction end time
router.get("/end-time/:productId", auctionController.getAuctionEndTime);

module.exports = router;
