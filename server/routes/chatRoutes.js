const express = require("express");
const { accessChat } = require("../controllers/chatControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// This route handles both finding and creating a 1-on-1 chat
router.route("/").post(protect, accessChat);

module.exports = router;