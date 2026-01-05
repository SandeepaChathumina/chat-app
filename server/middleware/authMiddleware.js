const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Middleware to protect routes by verifying JWT tokens
const protect = async (req, res, next) => {
  let token;

  console.log("Auth Middleware - Authorization header:", req.headers.authorization);

  // Check if token exists in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from header (Format: Bearer <token>)
      token = req.headers.authorization.split(" ")[1];
      console.log("Token extracted successfully");

      // Verify the token using JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded for user ID:", decoded.id);

      // Fetch user from database (excluding password) and attach to request
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        console.error("User not found in database");
        return res.status(401).json({ message: "User not found" });
      }

      console.log(`User authenticated: ${req.user.firstName} (${req.user._id})`);
      next(); // Proceed to the protected route

    } catch (error) {
      console.error("JWT verification error:", error.message);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // If no token was found
  if (!token) {
    console.log("No authorization token found");
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };