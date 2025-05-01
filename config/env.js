require("dotenv").config();

// Create a consistent secret key that we log fully for debugging
const JWT_SECRET_KEY = process.env.JWT_SECRET || "your_secure_secret_key";

// Log the complete secret for debugging (only do this in development!)
console.log("Environment Configuration:");
console.log("- NODE_ENV:", process.env.NODE_ENV || "development");
console.log("- JWT_SECRET:", JWT_SECRET_KEY);

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb://ahmed_ismail03:UnqDjW7xr3K6SZ79@cluster0-shard-00-00.d1hny.mongodb.net:27017,cluster0-shard-00-01.d1hny.mongodb.net:27017,cluster0-shard-00-02.d1hny.mongodb.net:27017/natours?replicaSet=atlas-mvwk3s-shard-0&ssl=true&authSource=admin",
  JWT_SECRET: JWT_SECRET_KEY,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || "http://127.0.0.1:3000",
};
