const express = require("express");
const { check } = require("express-validator");
const messageController = require("../controllers/messageController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");
//message latest change at 3:09 am
const router = express.Router();

router.get("/chat/:userId", auth, messageController.getChatHistory);


router.get("/chats", auth, messageController.getUserChats);

router.post(
  "/",
  auth,
  [
    check("receiverId", "Receiver ID is required").not().isEmpty(),
    check("content", "Message content is required").not().isEmpty(),
  ],
  validation,
  messageController.sendMessage
);

router.put("/read/:senderId", auth, messageController.markMessagesAsRead);

module.exports = router;
