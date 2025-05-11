const Message = require("../models/Message");
const User = require("../models/User");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

// Helper function to generate consistent conversation IDs
const generateConversationId = (userId1, userId2) => {
  return [userId1.toString(), userId2.toString()].sort().join("_");
};

module.exports = (io, socket) => {
  // Join a chat room with another user
  socket.on("join-chat", async (receiverId) => {
    try {
      // Check if receiver exists
      if (receiverId !== "support") {
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return socket.emit("error", { message: "User not found" });
        }
      }

      const roomId = getChatRoomId(socket.user._id.toString(), receiverId);
      socket.join(roomId);
      logger.info(
        `User ${socket.user._id} joined chat room with ${receiverId}`
      );

      // Generate conversation ID
      const conversationId = generateConversationId(
        socket.user._id.toString(),
        receiverId
      );

      // Mark messages as read when joining a chat
      await Message.updateMany(
        {
          conversationId,
          senderId: receiverId,
          receiverId: socket.user._id.toString(),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
            status: "read",
          },
        }
      );

      // Emit to the room that messages were read
      io.to(roomId).emit("messages-read", {
        by: socket.user._id,
        conversationId,
      });
    } catch (error) {
      logger.error("Error joining chat:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });
  // Send a message
  socket.on("send-message", async (data) => {
    try {
      const { receiverId, content, messageType = "text", metadata = {} } = data;

      if (!content || content.trim() === "") {
        return socket.emit("error", { message: "Message cannot be empty" });
      }

      // Generate conversation ID
      const conversationId = generateConversationId(
        socket.user._id.toString(),
        receiverId
      );

      // Create and save the message
      const message = new Message({
        senderId: socket.user._id,
        receiverId,
        conversationId,
        content,
        messageType,
        metadata,
        isRead: false,
        status: "sent",
      });

      await message.save();

      // Get the room ID
      const roomId = getChatRoomId(socket.user._id.toString(), receiverId);

      // Emit the message to the room
      io.to(roomId).emit("new-message", {
        _id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        conversationId: message.conversationId,
        content: message.content,
        messageType: message.messageType,
        sentAt: message.sentAt,
        isRead: message.isRead,
        status: message.status,
        metadata: message.metadata,
      });
      // Also emit an update to both users' chat list
      socket.emit("chat-updated", {
        partnerId: receiverId,
        message: {
          id: message._id,
          content: message.content,
          sentAt: message.sentAt,
          isFromUser: true,
          isRead: false,
          messageType: message.messageType,
        },
      });

      // Find sockets of the receiver and emit updates to them
      const receiverSocketId = getUserSocketId(io, receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("chat-updated", {
          partnerId: socket.user._id.toString(),
          message: {
            id: message._id,
            content: message.content,
            sentAt: message.sentAt,
            isFromUser: false,
            isRead: false,
            messageType: message.messageType,
          },
        });

        // Also update message status to delivered when receiver is online
        await Message.findByIdAndUpdate(message._id, {
          status: "delivered",
          deliveredAt: new Date(),
        });

        // Notify receiver about new message
        io.to(receiverSocketId).emit("new-message-notification", {
          senderId: socket.user._id,
          senderName: socket.user.name,
          messageId: message._id,
          content: content.substring(0, 50), // Preview of message
          conversationId: message.conversationId,
          messageType: message.messageType,
        });
      }
    } catch (error) {
      logger.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });
  // Mark messages as read
  socket.on("mark-messages-read", async (senderId) => {
    try {
      // Generate conversation ID
      const conversationId = generateConversationId(
        socket.user._id.toString(),
        senderId
      );

      // Update messages
      const result = await Message.updateMany(
        {
          conversationId,
          senderId,
          receiverId: socket.user._id.toString(),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
            status: "read",
          },
        }
      );

      if (result.nModified > 0) {
        const roomId = getChatRoomId(socket.user._id.toString(), senderId);
        io.to(roomId).emit("messages-read", {
          by: socket.user._id,
          conversationId,
          timestamp: new Date(),
        });

        // Notify the other user that their messages were read
        const senderSocketId = getUserSocketId(io, senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages-read-notification", {
            readBy: socket.user._id,
            readByName: socket.user.name,
            conversationId,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error("Error marking messages as read:", error);
      socket.emit("error", { message: "Failed to mark messages as read" });
    }
  });
  // Leave chat room
  socket.on("leave-chat", (receiverId) => {
    const roomId = getChatRoomId(socket.user._id.toString(), receiverId);
    socket.leave(roomId);
    logger.info(`User ${socket.user._id} left chat room with ${receiverId}`);
  });

  // Handle typing status
  socket.on("typing-start", (receiverId) => {
    const roomId = getChatRoomId(socket.user._id.toString(), receiverId);
    socket.to(roomId).emit("typing", {
      userId: socket.user._id.toString(),
      userName: socket.user.name,
      isTyping: true,
    });
  });

  socket.on("typing-stop", (receiverId) => {
    const roomId = getChatRoomId(socket.user._id.toString(), receiverId);
    socket.to(roomId).emit("typing", {
      userId: socket.user._id.toString(),
      userName: socket.user.name,
      isTyping: false,
    });
  });
};

// Helper function to generate consistent room IDs for chats
function getChatRoomId(id1, id2) {
  return ["chat", id1, id2].sort().join("-");
}

// Helper function to find a user's socket
function getUserSocketId(io, userId) {
  const sockets = io.sockets.sockets;
  for (const [socketId, socket] of sockets) {
    if (socket.user && socket.user._id.toString() === userId.toString()) {
      return socketId;
    }
  }
  return null;
}
