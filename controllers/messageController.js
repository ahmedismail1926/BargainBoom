const { validationResult } = require("express-validator");
const messageService = require("../services/messageService");
const logger = require("../utils/logger");
const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../utils/responseHandler");

exports.getChatHistory = async (req, res, next) => {
  try {
    const otherUserId = req.params.userId;
    if (!otherUserId) {
      return errorResponse(res, "User ID is required", 400);
    }

    // Add logging for debugging
    logger.info(
      `Fetching chat history: user=${req.user._id}, partner=${otherUserId}`
    );

    // Accept 'support' or valid ObjectId, but don't reject if it's not valid ObjectId (let service handle it)
    // Remove strict validation here, let the service handle it and return empty if not found

    // Check if pagination is requested
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    let page = null;
    let limit = null;

    if (hasPagination) {
      page = parseInt(req.query.page) || 1;
      limit = parseInt(req.query.limit) || 50;
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1 || limit > 100) limit = 50;
    }

    // Pass the ID as-is to the service
    const messages = await messageService.getChatHistory(
      req.user._id,
      otherUserId,
      page,
      limit
    );

    return successResponse(res, messages);
  } catch (error) {
    logger.error("Error fetching chat history:", error);

    // Always return a user-friendly error, don't crash
    if (
      error.message &&
      (error.message.includes("Invalid") || error.message.includes("Missing"))
    ) {
      return errorResponse(res, error.message, 400);
    }

    next(error);
  }
};

exports.getUserChats = async (req, res, next) => {
  try {
    const chats = await messageService.getUserChats(req.user._id);
    res.status(200).json(chats);
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message (REST API endpoint as fallback to WebSockets)
 */
exports.sendMessage = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      receiverId,
      content,
      messageType = "text",
      metadata = {},
    } = req.body;

    const message = await messageService.sendMessage({
      senderId: req.user._id,
      receiverId,
      content,
      messageType,
      metadata,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    next(error);
  }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const senderId = req.params.senderId;

    if (!senderId) {
      return errorResponse(res, "Sender ID is required", 400);
    }

    const result = await messageService.markMessagesAsRead(
      senderId,
      req.user._id
    );

    res.status(200).json({
      message: "Messages marked as read",
      count: result.modifiedCount || 0,
    });
  } catch (error) {
    logger.error("Error in markMessagesAsRead controller:", error);
    // Always return a successful response to the client
    res.status(200).json({ message: "Operation completed", count: 0 });
  }
};
