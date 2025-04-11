const express = require('express');
const { check } = require('express-validator');
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = express.Router();

// Get chat history with a user
router.get('/chat/:userId', auth, messageController.getChatHistory);

// Get all chats for a user
router.get('/chats', auth, messageController.getUserChats);

// Send a message (REST API endpoint as fallback to WebSockets)
router.post(
  '/',
  auth,
  [
    check('receiverId', 'Receiver ID is required').not().isEmpty(),
    check('content', 'Message content is required').not().isEmpty()
  ],
  messageController.sendMessage
);

// Mark messages as read
router.put('/read/:senderId', auth, messageController.markMessagesAsRead);

module.exports = router;

// middleware/validation.js
const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};