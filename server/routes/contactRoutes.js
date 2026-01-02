const express = require("express");
const { addContact, getMyContacts } = require("../controllers/contactControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, addContact).get(protect, getMyContacts);

module.exports = router;