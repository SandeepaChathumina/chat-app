const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// authMiddleware.js
const protect = async (req, res, next) => {
  let token;

  console.log("Authorization header:", req.headers.authorization); // Debug

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (Format: Bearer <token>)
      token = req.headers.authorization.split(" ")[1];
      console.log("Token extracted:", token); // Debug

      // Decodes token id
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded:", decoded); // Debug

      // Fetch user from DB and attach to the request object
      req.user = await User.findById(decoded.id).select("-password");

      next(); // Move to the controller
    } catch (error) {
      console.error("JWT verification error:", error); // Debug
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    console.log("No token found"); // Debug
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };