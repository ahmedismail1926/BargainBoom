const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Generate a consistent conversation ID between two users
 * @param {string|ObjectId} userId1 - First user ID
 * @param {string|ObjectId} userId2 - Second user ID
 * @returns {string} - Conversation ID
 */
const generateConversationId = (userId1, userId2) => {
  // Make sure we have strings to work with
  const id1 = userId1 ? userId1.toString() : "";
  const id2 = userId2 ? userId2.toString() : "";

  // Always sort to ensure conversation ID is consistent regardless of parameter order
  return [id1, id2].sort().join("_");
};

exports.getChatHistory = async (
  userId1,
  userId2,
  page = null,
  limit = null
) => {
  try {
    // Sanitize and validate input parameters
    if (!userId1) {
      throw new Error("Missing current user ID");
    }
    if (!userId2) {
      throw new Error("Missing partner user ID");
    } // Convert userId1 to ObjectId if valid, else use as string
    let userId1Query = userId1;
    if (
      typeof userId1 === "string" &&
      mongoose.Types.ObjectId.isValid(userId1)
    ) {
      userId1Query = new mongoose.Types.ObjectId(userId1);
    }

    // For userId2, allow 'support' or valid ObjectId, else use as string
    let userId2Query = userId2;
    if (userId2 !== "support") {
      if (mongoose.Types.ObjectId.isValid(userId2)) {
        userId2Query = new mongoose.Types.ObjectId(userId2);
      } else {
        // Instead of throwing, just use as string (could be a future special user)
        userId2Query = userId2;
      }
    }

    // Generate conversation ID
    const conversationId = generateConversationId(userId1, userId2);

    // Prepare the query using conversationId for better performance
    let messagesQuery = Message.find({ conversationId }).sort("-sentAt");

    if (page !== null && limit !== null) {
      const skip = (page - 1) * limit;
      messagesQuery = messagesQuery.skip(skip).limit(limit);
    }

    const messages = await messagesQuery;

    let paginationInfo = null;
    if (page !== null && limit !== null) {
      const total = await Message.countDocuments({ conversationId });

      paginationInfo = {
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    }

    return {
      messages,
      pagination: paginationInfo,
      error: null,
    };
  } catch (error) {
    logger.error("Error in getChatHistory", { error, userId1, userId2 });
    // Return empty messages and error in data, do not throw
    return {
      messages: [],
      pagination: null,
      error: error.message || "Unknown error",
    };
  }
};

/**
 * Get all chats for a user with latest message
 */
exports.getUserChats = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Convert userId to string for consistent comparison
    const userIdStr = userId.toString();

    // Fetch conversations for this user using the most efficient approach
    const conversations = await Message.aggregate([
      // Match messages where the user is either sender or receiver
      {
        $match: {
          $or: [{ senderId: userIdStr }, { receiverId: userIdStr }],
        },
      },
      // Extract just the conversation IDs
      {
        $group: {
          _id: "$conversationId",
        },
      },
    ]);

    const chats = [];

    // For each conversation, get latest message and partner details
    for (const conversation of conversations) {
      const conversationId = conversation._id;
      const [userId1, userId2] = conversationId.split("_");

      // Determine partner ID
      const partnerId = userId1 === userIdStr ? userId2 : userId1;

      // Skip 'support' and self conversations for now
      if (partnerId === "support" || partnerId === userIdStr) continue;
      try {
        // Skip invalid ObjectId for regular user partners
        if (
          partnerId !== "support" &&
          !mongoose.Types.ObjectId.isValid(partnerId)
        ) {
          logger.warn(`Invalid partner ID format: ${partnerId}, skipping`);
          continue;
        }

        // Get the latest message using conversation ID for better performance
        const latestMessage = await Message.findOne({
          conversationId,
        }).sort("-sentAt");

        if (!latestMessage) {
          logger.warn(
            `No messages found for conversation: ${conversationId}, skipping`
          );
          continue;
        }

        // Get the partner's info if it's a regular user (not 'support')
        let partner;
        if (partnerId === "support") {
          partner = { _id: "support", name: "Support" };
        } else {
          partner = await User.findById(partnerId).select("name");
          if (!partner) {
            logger.warn(`Partner user not found: ${partnerId}, skipping`);
            continue;
          }
        }

        // Count unread messages
        const unreadCount = await Message.countDocuments({
          conversationId,
          senderId: partnerId,
          receiverId: userIdStr,
          isRead: false,
        });

        chats.push({
          partner: {
            id: partner._id,
            name: partner.name,
          },
          latestMessage: {
            id: latestMessage._id,
            content: latestMessage.content,
            sentAt: latestMessage.sentAt,
            isFromUser: latestMessage.senderId.toString() === userIdStr,
            isRead: latestMessage.isRead,
          },
          unreadCount,
        });
      } catch (error) {
        // Log error but continue with next partner
        logger.error(`Error processing chat partner ${partnerId}:`, error);
        continue;
      }
    }

    // Sort by latest message date
    chats.sort(
      (a, b) =>
        new Date(b.latestMessage.sentAt) - new Date(a.latestMessage.sentAt)
    );

    return chats;
  } catch (error) {
    logger.error("Error in getUserChats", { userId, error });
    throw error;
  }
};

/**
 * Send a message
 */
exports.sendMessage = async (messageData) => {
  try {
    // Generate the conversation ID
    const conversationId = generateConversationId(
      messageData.senderId,
      messageData.receiverId
    );

    // Add conversationId to message data
    const messageWithConversation = {
      ...messageData,
      conversationId,
    };

    const message = new Message(messageWithConversation);
    await message.save();
    return message;
  } catch (error) {
    logger.error("Error in sendMessage", { messageData, error });
    throw error;
  }
};

/**
 * Mark messages as read
 * @param {ObjectId|string} senderId - ID of the sender whose messages will be marked as read
 * @param {string} receiverId - ID of the receiver (current user) who is reading the messages
 */
exports.markMessagesAsRead = async (senderId, receiverId) => {
  try {
    if (!senderId) {
      logger.warn("markMessagesAsRead called with null/undefined senderId");
      return { nModified: 0 };
    }
    if (!receiverId) {
      logger.warn("markMessagesAsRead called with null/undefined receiverId");
      return { nModified: 0 };
    }
    // Mark all messages sent by senderId to receiverId as read, regardless of conversationId
    const result = await Message.updateMany(
      {
        senderId: senderId.toString(),
        receiverId: receiverId.toString(),
        isRead: false,
      },
      { $set: { isRead: true, readAt: new Date(), status: "read" } }
    );
    return result;
  } catch (error) {
    logger.error("Error in markMessagesAsRead", {
      senderId,
      receiverId,
      error: error.message || "Unknown error",
    });
    return { modifiedCount: 0 };
  }
};
