// Frontend Example: CountdownTimer.js
// Component for displaying auction time remaining

import React, { useState, useEffect } from "react";

const CountdownTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date();
    const end = new Date(endTime);
    const difference = end - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, expired: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired) {
        clearInterval(timer);
        // Force page refresh to update auction status when it ends
        setTimeout(() => window.location.reload(), 1000);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.expired) {
    return <div className="countdown expired">Auction has ended</div>;
  }

  return (
    <div className="countdown">
      {timeLeft.days > 0 && (
        <span className="countdown-segment">
          <span className="countdown-value">{timeLeft.days}</span>
          <span className="countdown-label">d</span>
        </span>
      )}
      <span className="countdown-segment">
        <span className="countdown-value">
          {timeLeft.hours.toString().padStart(2, "0")}
        </span>
        <span className="countdown-label">h</span>
      </span>
      <span className="countdown-segment">
        <span className="countdown-value">
          {timeLeft.minutes.toString().padStart(2, "0")}
        </span>
        <span className="countdown-label">m</span>
      </span>
      <span className="countdown-segment">
        <span className="countdown-value">
          {timeLeft.seconds.toString().padStart(2, "0")}
        </span>
        <span className="countdown-label">s</span>
      </span>
    </div>
  );
};

export default CountdownTimer;
