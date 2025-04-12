const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");

// Check if JWT_SECRET is defined, if not use a default (for development only)
const SECRET_KEY = JWT_SECRET || "your_secure_secret_key";
const EXPIRES_IN = JWT_EXPIRES_IN || "1d"; // Default expiration time

exports.register = async (userData) => {
  const { email } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Create new user
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
  if (!SECRET_KEY || SECRET_KEY.trim() === "") {
    throw new Error("JWT_SECRET is not configured properly");
  }

  return jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, {
    expiresIn: EXPIRES_IN,
  });
};
