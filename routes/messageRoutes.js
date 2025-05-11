const express = require("express");
const { check } = require("express-validator");
const messageController = require("../controllers/messageController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");
//message latest change at 3:09 am
const router = express.Router();

// Get chat history with pagination (when page and limit are provided)
router.get("/chat/:userId", auth, messageController.getChatHistory);

// New endpoint specifically for getting all messages without pagination
router.get("/chat/:userId/all", auth, (req, res, next) => {
  // Force no pagination by setting query params to null
  req.query.page = null;
  req.query.limit = null;
  messageController.getChatHistory(req, res, next);
});

// Get user's active conversations
router.get("/chats", auth, messageController.getUserChats);

// Send a message
router.post(
  "/",
  auth,
  [
    check("receiverId", "Receiver ID is required").not().isEmpty(),
    check("content", "Message content is required").not().isEmpty(),
    check("messageType", "Invalid message type")
      .optional()
      .isIn(["text", "system", "image", "file"]),
  ],
  validation,
  messageController.sendMessage
);

router.put("/read/:senderId", auth, messageController.markMessagesAsRead);

module.exports = router;
