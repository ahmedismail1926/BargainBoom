const chatHandler = require("./chatHander");
const bidHandler = require("./bidHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, SOCKET_CORS_ORIGIN } = require("../config/env");
const logger = require("../utils/logger");

module.exports = (io) => {
  // Set up CORS for Socket.io
  io.engine.on("initial_headers", (headers, req) => {
    headers["Access-Control-Allow-Origin"] = SOCKET_CORS_ORIGIN;
  });

  /**
   * if error:
   * const io = require('socket.io')(httpServer, {
  cors: {
    origin: SOCKET_CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
});
   */

  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication error - No token provided"));
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select("-passwordHash");

      if (!user) {
        return next(new Error("Authentication error - User not found"));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);
      next(new Error("Authentication error - Invalid token"));
    }
  });

  // Real-time user presence tracking
  const onlineUsers = new Map();

  // Initialize socket connection
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    logger.info(`User connected: ${userId}`);

    // Add user to online users
    onlineUsers.set(userId, {
      socketId: socket.id,
      lastActive: new Date(),
    });

    // Broadcast user online status
    io.emit("user-status-change", {
      userId,
      status: "online",
    });

    // Set up chat handlers
    chatHandler(io, socket);

    // Set up bidding handlers
    bidHandler(io, socket);

    // Update user's last active timestamp periodically
    socket.on("heartbeat", () => {
      if (onlineUsers.has(userId)) {
        const userData = onlineUsers.get(userId);
        userData.lastActive = new Date();
        onlineUsers.set(userId, userData);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${userId}`);

      // Remove user from online users
      onlineUsers.delete(userId);

      // Broadcast user offline status
      io.emit("user-status-change", {
        userId,
        status: "offline",
      });
    });

    // Check if a user is online
    socket.on("check-user-status", async (checkUserId, callback) => {
      const isOnline = onlineUsers.has(checkUserId);

      if (typeof callback === "function") {
        callback({
          userId: checkUserId,
          status: isOnline ? "online" : "offline",
        });
      } else {
        socket.emit("user-status", {
          userId: checkUserId,
          status: isOnline ? "online" : "offline",
        });
      }
    });

    // Get all online users
    socket.on("get-online-users", (callback) => {
      const onlineUserIds = Array.from(onlineUsers.keys());

      if (typeof callback === "function") {
        callback(onlineUserIds);
      } else {
        socket.emit("online-users", onlineUserIds);
      }
    });
  });

  // Periodically clean up inactive connections
  setInterval(() => {
    const now = new Date();

    for (const [userId, userData] of onlineUsers.entries()) {
      // If user hasn't sent a heartbeat in 5 minutes, consider them offline
      if (now - userData.lastActive > 5 * 60 * 1000) {
        onlineUsers.delete(userId);

        // Broadcast user offline status
        io.emit("user-status-change", {
          userId,
          status: "offline",
        });

        logger.info(`Removed inactive user: ${userId}`);
      }
    }
  }, 60 * 1000); // Check every minute
};
