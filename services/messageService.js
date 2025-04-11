const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Get chat history between two users
 */
exports.getChatHistory = async (userId1, userId2, page, limit) => {
  const skip = (page - 1) * limit;
  
  const messages = await Message.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ]
  })
    .sort('-sentAt')
    .skip(skip)
    .limit(limit);
  
  const total = await Message.countDocuments({
    $or: [{ senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ]
    });
    
    // Mark messages from the other user as read
    await exports.markMessagesAsRead(userId2, userId1);
    
    return {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  };
  
  /**
   * Get all chats for a user with latest message
   */
  exports.getUserChats = async (userId) => {
    // Find all users this user has chatted with
    const sentMessages = await Message.distinct('receiverId', { senderId: userId });
    const receivedMessages = await Message.distinct('senderId', { receiverId: userId });
    
    // Combine unique chat partners
    const chatPartnerIds = [...new Set([...sentMessages, ...receivedMessages])];
    
    const chats = [];
    
    // For each chat partner, get the latest message and user info
    for (const partnerId of chatPartnerIds) {
      // Skip 'support' for now as it's a special case
      if (partnerId === 'support') continue;
      
      // Get the latest message
      const latestMessage = await Message.findOne({
        $or: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId }
        ]
      }).sort('-sentAt');
      
      // Get the partner's info
      const partner = await User.findById(partnerId).select('name');
      
      if (partner && latestMessage) {
        // Count unread messages
        const unreadCount = await Message.countDocuments({
          senderId: partnerId,
          receiverId: userId,
          isRead: false
        });
        
        chats.push({
          partner: {
            id: partner._id,
            name: partner.name
          },
          latestMessage: {
            id: latestMessage._id,
            content: latestMessage.content,
            sentAt: latestMessage.sentAt,
            isFromUser: latestMessage.senderId.toString() === userId.toString()
          },
          unreadCount
        });
      }
    }
    
    // Sort by latest message date
    chats.sort((a, b) => b.latestMessage.sentAt - a.latestMessage.sentAt);
    
    return chats;
  };
  
  /**
   * Send a message
   */
  exports.sendMessage = async (messageData) => {
    const message = new Message(messageData);
    await message.save();
    return message;
  };
  
  /**
   * Mark messages as read
   */
  exports.markMessagesAsRead = async (senderId, receiverId) => {
    return await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { isRead: true }
    );
  };
  