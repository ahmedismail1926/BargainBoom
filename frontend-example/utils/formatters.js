// Frontend Example: utils/formatters.js
// Utility functions for formatting data in the frontend

// Format currency with 2 decimal places
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date to a readable string
export const formatDate = (date) => {
  if (!date) return "N/A";

  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
};

// Calculate and format time remaining until a given date
export const timeRemaining = (endTime) => {
  const now = new Date();
  const end = new Date(endTime);
  const difference = end - now;

  if (difference <= 0) {
    return "Ended";
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};
