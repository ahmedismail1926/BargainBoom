/**
 * Test script for auction functionality
 * This script helps validate the auction functionality by:
 * 1. Creating a test auction product
 * 2. Placing bids on the auction product
 * 3. Retrieving and validating the max bid
 */

const mongoose = require("mongoose");
const Product = require("../models/Product");
const AuctionBid = require("../models/AuctionBid");
const User = require("../models/User");
const auctionService = require("../services/auctionService");
const { connect } = require("../config/db");
const logger = require("./logger");

// Connect to database
connect();

const createTestAuction = async () => {
  logger.info("Creating test auction product...");

  // Find or create a test seller
  let testSeller = await User.findOne({ email: "testseller@example.com" });
  if (!testSeller) {
    testSeller = new User({
      name: "Test Seller",
      email: "testseller@example.com",
      passwordHash: "notarealpassword", // In a real scenario, this would be properly hashed
      role: "seller",
    });
    await testSeller.save();
  }

  // Create a test auction product
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const auctionProduct = new Product({
    sellerId: testSeller._id,
    title: "Test Auction Product",
    description: "This is a test auction product for validation",
    basePrice: 100, // Starting bid
    quantity: 1,
    isAuction: true,
    auctionEndTime: oneWeekFromNow,
    category: "Test",
    imageUrls: ["https://via.placeholder.com/300"],
    status: "available",
  });

  await auctionProduct.save();
  logger.info(`Test auction product created with ID: ${auctionProduct._id}`);

  return { testSeller, auctionProduct };
};

const createTestBids = async (auctionProduct) => {
  logger.info("Creating test bids...");

  // Create test bidders
  const testBidders = [];
  for (let i = 1; i <= 3; i++) {
    const bidderEmail = `testbidder${i}@example.com`;
    let bidder = await User.findOne({ email: bidderEmail });

    if (!bidder) {
      bidder = new User({
        name: `Test Bidder ${i}`,
        email: bidderEmail,
        passwordHash: "notarealpassword",
        role: "buyer",
      });
      await bidder.save();
    }

    testBidders.push(bidder);
  }

  // Place bids in ascending order
  const bidAmounts = [110, 120, 135];
  const bids = [];

  for (let i = 0; i < testBidders.length; i++) {
    const bidData = {
      productId: auctionProduct._id,
      buyerId: testBidders[i]._id,
      bidAmount: bidAmounts[i],
    };

    try {
      const bid = await auctionService.createBid(bidData);
      bids.push(bid);
      logger.info(`Bid placed by ${testBidders[i].name} for $${bidAmounts[i]}`);
    } catch (error) {
      logger.error(`Error placing bid: ${error.message}`);
    }
  }

  return { testBidders, bids };
};

const validateMaxBid = async (auctionProduct) => {
  logger.info("Validating max bid...");

  try {
    // Get the max bid info
    const maxBidInfo = await auctionService.getMaxBid(auctionProduct._id);

    // Verify the product has been updated with the max bid amount
    const updatedProduct = await Product.findById(auctionProduct._id);

    logger.info("Max Bid Information:");
    logger.info(`- Product ID: ${maxBidInfo.productId}`);
    logger.info(`- Max Bid Amount: $${maxBidInfo.currentMaxBid}`);
    logger.info(`- Bidder: ${maxBidInfo.bidderName || "None"}`);

    // Validate that the product's basePrice matches the max bid
    if (updatedProduct.basePrice === maxBidInfo.currentMaxBid) {
      logger.info(
        "✅ PASS: Product basePrice correctly updated to max bid amount"
      );
    } else {
      logger.error(
        `❌ FAIL: Product basePrice (${updatedProduct.basePrice}) does not match max bid (${maxBidInfo.currentMaxBid})`
      );
    }

    return maxBidInfo;
  } catch (error) {
    logger.error(`Error validating max bid: ${error.message}`);
    throw error;
  }
};

const cleanupTestData = async (auctionProduct, testBidders, testSeller) => {
  logger.info("Cleaning up test data...");

  try {
    // Remove test bids
    await AuctionBid.deleteMany({ productId: auctionProduct._id });

    // Remove test product
    await Product.findByIdAndDelete(auctionProduct._id);

    // Optionally remove test users - commented out to allow reuse in subsequent tests
    /*
    await User.deleteMany({
      _id: { $in: [...testBidders.map(b => b._id), testSeller._id] }
    });
    */

    logger.info("Test data cleanup completed");
  } catch (error) {
    logger.error(`Error cleaning up test data: ${error.message}`);
  }
};

const runAuctionTests = async () => {
  try {
    logger.info("=== STARTING AUCTION FUNCTIONALITY TESTS ===");

    // Create test auction
    const { testSeller, auctionProduct } = await createTestAuction();

    // Add bids
    const { testBidders, bids } = await createTestBids(auctionProduct);

    // Validate max bid
    const maxBidInfo = await validateMaxBid(auctionProduct);

    // Cleanup
    await cleanupTestData(auctionProduct, testBidders, testSeller);

    logger.info("=== AUCTION FUNCTIONALITY TESTS COMPLETED ===");

    return { success: true, maxBidInfo };
  } catch (error) {
    logger.error(`Test execution failed: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Disconnect from MongoDB
    setTimeout(() => {
      mongoose.disconnect();
      logger.info("Disconnected from MongoDB");
    }, 1000);
  }
};

// Run the tests
runAuctionTests()
  .then((result) => {
    if (result.success) {
      logger.info("All tests completed successfully!");
    } else {
      logger.error(`Tests failed: ${result.error}`);
    }
  })
  .catch((error) => {
    logger.error(`Unexpected error during test execution: ${error.message}`);
  });
