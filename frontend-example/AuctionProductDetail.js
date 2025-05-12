// Frontend Example: AuctionProductDetail.js
// This is a reference implementation for how the frontend can implement auction functionality

import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import socketIOClient from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import { formatCurrency, formatDate, timeRemaining } from "../utils/formatters";
import BidHistory from "./BidHistory";
import CountdownTimer from "./CountdownTimer";
import { API_BASE_URL, SOCKET_URL } from "../config";

const AuctionProductDetail = () => {
  const { id } = useParams();
  const { user, token } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [maxBid, setMaxBid] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [socket, setSocket] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [bidError, setBidError] = useState("");
  const [loading, setLoading] = useState(true);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const socketInstance = socketIOClient(SOCKET_URL, {
      auth: { token },
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      // Join the bidding room for this product
      socketInstance.emit("join-bidding", id);
    });

    socketInstance.on("auction-status", (data) => {
      setMaxBid({
        currentPrice: data.currentPrice,
        bidderName: data.bidderName || "No bids yet",
        bidTime: data.bidTime,
        auctionEndTime: new Date(data.auctionEndTime),
      });
      // Set initial bid amount suggestion (current price + minimum increment)
      setBidAmount((data.currentPrice + 1).toString());
    });

    socketInstance.on("new-bid", (data) => {
      // Update max bid when someone places a new bid
      setMaxBid({
        currentPrice: data.bidAmount,
        bidderName: data.bidderName,
        bidTime: data.timestamp,
        auctionEndTime: maxBid ? maxBid.auctionEndTime : null,
      });

      // Update bid history
      setBidHistory((prev) => [
        {
          bidAmount: data.bidAmount,
          bidderName: data.bidderName,
          timestamp: new Date(data.timestamp),
        },
        ...prev,
      ]);

      // Update suggested bid amount
      setBidAmount((data.bidAmount + 1).toString());

      // Show notification
      if (data.bidderId !== user?._id) {
        showBidNotification(data.bidderName, data.bidAmount);
      }
    });

    socketInstance.on("bid-error", (error) => {
      setBidError(error.message);
      setTimeout(() => setBidError(""), 5000);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.emit("leave-bidding", id);
        socketInstance.disconnect();
      }
    };
  }, [id, token, user]);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
        const data = await response.json();

        if (data.success) {
          setProduct(data.data);
        } else {
          console.error("Error fetching product:", data.message);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchBidHistory = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auctions/product/${id}`
        );
        const data = await response.json();

        if (data.success) {
          setBidHistory(
            data.data.map((bid) => ({
              bidAmount: bid.bidAmount,
              bidderName: bid.buyerId.name,
              timestamp: new Date(bid.createdAt),
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching bid history:", error);
      }
    };

    fetchProduct();
    fetchBidHistory();
  }, [id]);

  // Show notification when new bid is placed
  const showBidNotification = (bidderName, bidAmount) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Bid Placed", {
        body: `${bidderName} placed a bid of ${formatCurrency(bidAmount)}`,
      });
    }
  };

  // Place a bid
  const placeBid = () => {
    if (!socket || !user) return;

    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount <= 0) {
      setBidError("Please enter a valid bid amount");
      return;
    }

    if (maxBid && amount < maxBid.currentPrice) {
      setBidError(
        `Bid must be at least ${formatCurrency(maxBid.currentPrice)}`
      );
      return;
    }

    // Clear any previous errors
    setBidError("");

    // Emit place-bid event
    socket.emit("place-bid", {
      productId: id,
      bidAmount: amount,
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!product) {
    return <div className="error">Product not found</div>;
  }

  // Check if auction has ended
  const auctionEnded = maxBid && new Date() > new Date(maxBid.auctionEndTime);

  return (
    <div className="auction-product-detail">
      <div className="product-info">
        <h1>{product.title}</h1>
        <div className="product-images">
          {product.imageUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`${product.title} - Image ${index + 1}`}
            />
          ))}
        </div>
        <p className="description">{product.description}</p>
        <div className="seller-info">
          <p>Seller: {product.sellerId.name}</p>
        </div>
      </div>

      <div className="auction-info">
        <h2>Auction Details</h2>

        {auctionEnded ? (
          <div className="auction-ended">
            <h3>Auction Ended</h3>
            <p>
              Final price:{" "}
              {maxBid
                ? formatCurrency(maxBid.currentPrice)
                : formatCurrency(product.basePrice)}
            </p>
            <p>Winner: {maxBid?.bidderName || "No bids were placed"}</p>
          </div>
        ) : (
          <>
            <div className="current-bid">
              <h3>Current Bid</h3>
              <p className="price">
                {maxBid
                  ? formatCurrency(maxBid.currentPrice)
                  : formatCurrency(product.basePrice)}
              </p>
              <p className="bidder">
                Bidder: {maxBid?.bidderName || "No bids yet"}
              </p>
              {maxBid?.bidTime && (
                <p className="bid-time">
                  Bid placed: {formatDate(maxBid.bidTime)}
                </p>
              )}
            </div>

            <div className="auction-time">
              <h3>Time Remaining</h3>
              <CountdownTimer
                endTime={maxBid?.auctionEndTime || product.auctionEndTime}
              />
            </div>

            {user && user._id !== product.sellerId._id && (
              <div className="place-bid">
                <h3>Place Your Bid</h3>
                {bidError && <p className="error">{bidError}</p>}
                <div className="bid-form">
                  <input
                    type="number"
                    step="0.01"
                    min={maxBid ? maxBid.currentPrice : product.basePrice}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter bid amount"
                  />
                  <button onClick={placeBid}>Place Bid</button>
                </div>
                <p className="bid-note">
                  Your bid must be at least{" "}
                  {formatCurrency(
                    maxBid ? maxBid.currentPrice : product.basePrice
                  )}
                </p>
              </div>
            )}
          </>
        )}

        <div className="bid-history">
          <h3>Bid History</h3>
          {bidHistory.length > 0 ? (
            <BidHistory bids={bidHistory} />
          ) : (
            <p>No bids placed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionProductDetail;
