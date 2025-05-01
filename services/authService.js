const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");

const EXPIRES_IN = JWT_EXPIRES_IN || "1d"; // Default expiration time

exports.register = async (userData) => {
  const { email } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Create new user - passwordHash field is now set to password directly
  // instead of wrapping it in a passwordHash property
  const user = new User(userData);
  await user.save();

  // Generate JWT token
  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

exports.login = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // Generate JWT token
  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const generateToken = (user) => {
  if (!JWT_SECRET || JWT_SECRET.trim() === "") {
    throw new Error("JWT_SECRET is not configured properly");
  }

  // Add debugging to see what secret is being used for signing
  console.log(
    "JWT_SECRET in authService.js:",
    JWT_SECRET
      ? `${JWT_SECRET.substring(0, 3)}...${JWT_SECRET.substring(
          JWT_SECRET.length - 3
        )}`
      : "undefined"
  );
  console.log("Creating token for user:", user._id.toString());

  // Use JWT_SECRET directly
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: EXPIRES_IN,
  });

  return token;
};
