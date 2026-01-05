const User = require("../models/userModel");
const generateToken = require("../config/generateToken");

// @desc    Register a new user
// @route   POST /api/user
// @access  Public
const registerUser = async (req, res) => {
  const { 
    username, 
    firstName, 
    lastName, 
    birthday, 
    email, 
    mobileNumber, 
    password 
  } = req.body;

  // 1. Validation: Ensure all fields are present
  if (!username || !firstName || !lastName || !birthday || !email || !mobileNumber || !password) {
    res.status(400);
    return res.json({ message: "Please enter all required fields" });
  }

  try {
    // 2. Check if user already exists (by email, username, or mobileNumber)
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }, { mobileNumber }] 
    });

    if (userExists) {
      res.status(400);
      if (userExists.email === email) {
        return res.json({ message: "User with this email already exists" });
      }
      if (userExists.username === username) {
        return res.json({ message: "Username already taken" });
      }
      if (userExists.mobileNumber === mobileNumber) {
        return res.json({ message: "Mobile number already registered" });
      }
    }

    // 3. Create the user
    const user = await User.create({
      username,
      firstName,
      lastName,
      birthday: new Date(birthday),
      email,
      mobileNumber,
      password,
    });

    if (user) {
      // 4. Generate token and respond with user data
      const token = generateToken(user._id);
      
      res.status(201).json({
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        pic: user.pic,
        birthday: user.birthday,
        token: token,
        message: "Registration Successful!",
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      message: "Server Error",
      error: error.message 
    });
  }
};

const authUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter email and password" });
  }

  try {
    // 1. Find user by email
    const user = await User.findOne({ email });

    // 2. Check if user exists AND password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        pic: user.pic,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid Email or Password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, authUser };