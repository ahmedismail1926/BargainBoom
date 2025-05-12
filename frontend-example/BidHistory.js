// Frontend Example: BidHistory.js
// Component for displaying auction bid history

import React from "react";
import { formatCurrency, formatDate } from "../utils/formatters";

const BidHistory = ({ bids }) => {
  return (
    <div className="bid-history-list">
      <table>
        <thead>
          <tr>
            <th>Bidder</th>
            <th>Amount</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid, index) => (
            <tr key={index}>
              <td>{bid.bidderName}</td>
              <td>{formatCurrency(bid.bidAmount)}</td>
              <td>{formatDate(bid.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BidHistory;
