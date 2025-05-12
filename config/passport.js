const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");
const logger = require("../utils/logger");

// Add debugging to see what secret is being used for verification
logger.info(
  "JWT_SECRET in passport.js:",
  JWT_SECRET
    ? `${JWT_SECRET.substring(0, 3)}...${JWT_SECRET.substring(
        JWT_SECRET.length - 3
      )}`
    : "undefined"
);

if (!JWT_SECRET) {
  logger.error("JWT_SECRET is undefined! Authentication will fail.");
}

const options = {
  jwtFromRequest: (req) => {
    // Custom extractor function to be more forgiving with token format
    let token = null;
    if (req.headers && req.headers.authorization) {
      const auth = req.headers.authorization;
      // Handle both "Bearer token" and raw "token" formats
      if (auth.startsWith("Bearer ")) {
        token = auth.split(" ")[1];
      } else if (auth.trim().length > 0) {
        // If there's no "Bearer " prefix but there is a string, use it as token
        token = auth.trim();
        logger.warn("Token provided without 'Bearer ' prefix");
      }
    }
    return token;
  },
  secretOrKey: JWT_SECRET,
  jsonWebTokenOptions: {
    ignoreExpiration: false, // Enforce token expiration
    maxAge: "7d", // Allow tokens to be valid for up to 7 days
  },
};

passport.use(
  new JwtStrategy(options, async (payload, done) => {
    try {
      logger.info("JWT payload received:", { payload });

      if (!payload.id) {
        logger.warn("JWT payload missing id field");
        return done(null, false, { message: "Invalid token payload" });
      }

      const user = await User.findById(payload.id);

      if (user) {
        logger.info(`User found for id: ${payload.id}`);
        // Ensure user._id is available as a string to match product.sellerId correctly
        return done(null, {
          _id: user._id.toString(),
          id: user._id.toString(), // Add this for compatibility
          name: user.name,
          email: user.email,
          role: user.role || "user", // Default to 'user' if role doesn't exist
        });
      }

      logger.warn(`User not found for id: ${payload.id}`);
      return done(null, false, { message: "User not found" });
    } catch (error) {
      logger.error("JWT verification error:", { error: error.message });
      return done(error, false);
    }
  })
);
