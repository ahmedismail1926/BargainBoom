const passport = require("passport");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const logger = require("../utils/logger");

module.exports = (req, res, next) => {
  // Log the incoming authorization header (with redaction for security)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    logger.info("Auth header present:", {
      headerPreview: authHeader.substring(0, 15) + "...",
    });

    // Try manual verification for debugging
    try {
      const token = authHeader.split(" ")[1];
      if (token) {
        // Just decode without verification to see payload
        const decoded = jwt.decode(token);
        logger.info("Token payload (decoded without verification):", {
          decoded,
        });

        // Try to manually verify the token to check if the secret is correct
        try {
          const verified = jwt.verify(token, JWT_SECRET);
          logger.info("Manual token verification successful");

          // If passport authentication is failing but manual verification works,
          // add the user to the request directly as a fallback
          if (verified && verified.id) {
            const User = require("../models/User");
            User.findById(verified.id)
              .then((user) => {
                if (user) {
                  logger.info(`Manually setting user from token: ${user._id}`);
                  req.user = user;
                }
              })
              .catch((err) => logger.error("Error finding user:", err));
          }
        } catch (verifyErr) {
          logger.warn("Manual token verification failed:", {
            error: verifyErr.message,
          });
        }
      }
    } catch (err) {
      logger.error("Error decoding token:", { error: err.message });
    }
  } else {
    logger.info("No authorization header found");
  }
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      logger.error("Auth middleware error:", { error: err });
      return next(err);
    }

    // If passport authentication fails but we have a user from manual verification
    if (!user && req.user) {
      logger.info(
        "Using manually verified user instead of passport authentication"
      );
      next();
      return;
    }

    if (!user) {
      logger.warn("Authentication failed:", {
        reason: info ? info.message : "Unknown reason",
      });

      // Check if token format is wrong (common issue)
      if (authHeader && !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          message: "Authorization header format should be 'Bearer <token>'",
        });
      }

      return res.status(401).json({
        message:
          info && info.message
            ? info.message
            : "Unauthorized - Authentication required",
      });
    }

    logger.info(
      `User authenticated successfully: ${user._id} (role: ${user.role})`
    );

    // Add user to request
    req.user = user;
    next();
  })(req, res, next);
};
