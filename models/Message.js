const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: String,
    required: true, // Can be a User ID or 'support'
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000, // Set a reasonable limit for message size
  },
  messageType: {
    type: String,
    enum: ["text", "system", "image", "file"],
    default: "text",
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ["sent", "delivered", "read", "failed"],
    default: "sent",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}, // For additional data based on message type
  },
});

// Index for faster queries by conversation (senderId + receiverId)
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, senderId: 1 });
messageSchema.index({ sentAt: -1 }); // For sorting by date

// Add a virtual field to easily check if message is from system
messageSchema.virtual("isSystemMessage").get(function () {
  return this.messageType === "system";
});

// Update readAt when isRead is set to true
messageSchema.pre("save", function (next) {
  if (this.isModified("isRead") && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);
