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
    if (
      otherUserId !== "support" &&
      !mongoose.Types.ObjectId.isValid(otherUserId)
    ) {
      return errorResponse(res, "Invalid user ID format", 400);
    }

    // Parse pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    if (isNaN(page) || page < 1) {
      page = 1;
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      limit = 50;
    }

    const messages = await messageService.getChatHistory(
      req.user._id,
      otherUserId,
      page,
      limit
    );

    return successResponse(res, messages);
  } catch (error) {
    logger.error("Error fetching chat history:", error);
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

exports.sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { receiverId, content } = req.body;
    const message = await messageService.sendMessage({
      senderId: req.user._id,
      receiverId,
      content,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    next(error);
  }
};
exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const senderId = req.params.senderId;

    await messageService.markMessagesAsRead(senderId, req.user._id);

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    next(error);
  }
};
