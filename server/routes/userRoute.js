const express = require("express");
const { registerUser,authUser } = require("../controllers/userController");

const router = express.Router();

// This route matches: POST /api/user/
// It takes the registration logic from the controller
router.route("/").post(registerUser);

router.route("/login").post(authUser);

// Later, you can add more routes here like:
// router.route("/login").post(authUser);
// router.route("/update").put(updateUserProfile);

module.exports = router;