const { validationResult } = require('express-validator');
const messageService = require('../services/messageService');

exports.getChatHistory = async (req, res, next) => {
  try {
    const otherUserId = req.params.userId;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await messageService.getChatHistory(
      req.user._id,
      otherUserId,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json(messages);
  } catch (error) {
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
    
    const { receiverId, content } = req.body;
    
    const message = await messageService.sendMessage({
      senderId: req.user._id,
      receiverId,
      content
    });
    
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const senderId = req.params.senderId;
    
    await messageService.markMessagesAsRead(senderId, req.user._id);
    
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
};