const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

exports.getChatHistory = async (userId1, userId2, page, limit) => {
  try {
    const skip = (page - 1) * limit;

    if (!userId1) {
      throw new Error("Missing current user ID");
    }

    if (!userId2) {
      throw new Error("Missing partner user ID");
    }

    const userId1Str = userId1.toString();

    let userId2Query = userId2;

    const queryConditions = [
      {
        senderId: userId1,
        receiverId: userId2,
      },
      {
        senderId: userId2Query,
        receiverId: userId1Str,
      },
    ];

    const messages = await Message.find({
      $or: queryConditions,
    })
      .sort("-sentAt")
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      $or: queryConditions,
    });

    try {
      await exports.markMessagesAsRead(userId2, userId1Str);
    } catch (error) {
      logger.error("Error marking messages as read", { error });
    }

    return {
      messages: messages.reverse(),
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error in getChatHistory", {
      userId1: userId1 ? userId1.toString() : "undefined",
      userId2: userId2 ? userId2.toString() : "undefined",
      error,
    });

    // Provide a more helpful error message
    if (error.name === "CastError" || error.message.includes("ObjectId")) {
      throw new Error(
        "Invalid ID format. Please check that all IDs are valid."
      );
    }

    throw error;
  }
};

exports.getUserChats = async (userId) => {
  try {
    const userIdStr = userId.toString();
    const sentMessages = await Message.distinct("receiverId", {
      senderId: userId,
    });
    const receivedMessages = await Message.distinct("senderId", {
      receiverId: userIdStr,
    });

    // Combine unique chat partners
    const chatPartnerIds = [...new Set([...sentMessages, ...receivedMessages])];

    const chats = [];
    for (const partnerId of chatPartnerIds) {
      if (partnerId === "support" || partnerId === userIdStr) continue;

      if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        logger.warn(`Invalid partner ID format: ${partnerId}, skipping`);
        continue;
      }

      try {
        const latestMessage = await Message.findOne({
          $or: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userIdStr },
          ],
        }).sort("-sentAt");

        const partner = await User.findById(partnerId).select("name");

        if (partner && latestMessage) {
          const unreadCount = await Message.countDocuments({
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
        }
      } catch (error) {
        // Log error but continue with next partner
        logger.error(`Error processing chat partner ${partnerId}:`, error);
        continue;
      }
    }
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

exports.sendMessage = async (messageData) => {
  try {
    const message = new Message(messageData);
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
    // Handle null or undefined senderId
    if (!senderId) {
      logger.warn("markMessagesAsRead called with null/undefined senderId");
      return { nModified: 0 };
    }

    // Convert senderId to ObjectId if it's a valid string ObjectId
    let senderIdQuery = senderId;
    if (
      typeof senderId === "string" &&
      mongoose.Types.ObjectId.isValid(senderId)
    ) {
      senderIdQuery = mongoose.Types.ObjectId(senderId);
    }

    return await Message.updateMany(
      { senderId: senderIdQuery, receiverId: receiverId, isRead: false },
      { $set: { isRead: true } }
    );
  } catch (error) {
    logger.error("Error in markMessagesAsRead", {
      senderId,
      receiverId,
      error,
    });
    // Return an empty result to avoid cascading failures
    return { nModified: 0 };
  }
};
