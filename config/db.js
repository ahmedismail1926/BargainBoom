const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { MONGODB_URI } = require("./env");

exports.connect = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
